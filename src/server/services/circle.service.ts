import { db } from "../db";
import { Circle, CircleRole } from "@/types";
import { backgroundQueue } from "../workers/queue";

export class CircleService {
  static getCircles(currentUserId?: string): Circle[] {
    const state = db.getState();
    return state.circles.map(c => {
      const isMember = currentUserId ? state.circle_members.some(cm => cm.circle_id === c.id && cm.user_id === currentUserId) : false;
      const membership = currentUserId ? state.circle_members.find(cm => cm.circle_id === c.id && cm.user_id === currentUserId) : undefined;
      const ownerUser = state.users.find(u => u.id === c.owner_id);
      const ownerProfile = state.profiles.find(p => p.user_id === c.owner_id);

      return {
        ...c,
        is_member: isMember,
        user_role: membership?.role,
        owner: ownerProfile && ownerUser ? { ...ownerProfile, username: ownerUser.username } : undefined,
      };
    });
  }

  static getCircleBySlug(slug: string, currentUserId?: string): Circle | null {
    const state = db.getState();
    const circle = state.circles.find(c => c.slug.toLowerCase() === slug.toLowerCase() || c.id === slug);
    if (!circle) return null;

    const isMember = currentUserId ? state.circle_members.some(cm => cm.circle_id === circle.id && cm.user_id === currentUserId) : false;
    const membership = currentUserId ? state.circle_members.find(cm => cm.circle_id === circle.id && cm.user_id === currentUserId) : undefined;
    const ownerUser = state.users.find(u => u.id === circle.owner_id);
    const ownerProfile = state.profiles.find(p => p.user_id === circle.owner_id);

    return {
      ...circle,
      is_member: isMember,
      user_role: membership?.role,
      owner: ownerProfile && ownerUser ? { ...ownerProfile, username: ownerUser.username } : undefined,
    };
  }

  static createCircle(ownerId: string, data: {
    name: string;
    description: string;
    avatarUrl?: string;
    bannerUrl?: string;
    isPrivate?: boolean;
  }): Circle {
    const state = db.getState();
    const cleanName = data.name.trim();
    if (cleanName.length < 3 || cleanName.length > 50) {
      throw new Error("Circle name must be between 3 and 50 characters.");
    }

    const slug = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    if (state.circles.some(c => c.slug === slug)) {
      throw new Error(`A Circle with slug "${slug}" already exists.`);
    }

    const circleId = `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newCircle: Circle = {
      id: circleId,
      name: cleanName,
      slug,
      description: data.description?.trim() || "",
      avatar_url: data.avatarUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=256&auto=format&fit=crop&q=80",
      banner_url: data.bannerUrl || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&auto=format&fit=crop&q=80",
      owner_id: ownerId,
      member_count: 1,
      is_private: !!data.isPrivate,
      created_at: now,
      updated_at: now,
    };

    state.circles.push(newCircle);
    state.circle_members.push({
      id: `cm_${circleId}_${ownerId}`,
      circle_id: circleId,
      user_id: ownerId,
      role: "OWNER",
      joined_at: now,
    });

    db.save();

    backgroundQueue.enqueue("AUDIT_LOG_RECORD", {
      actorId: ownerId,
      action: "CIRCLE_CREATE",
      resourceType: "CIRCLE",
      resourceId: circleId,
      metadata: { name: cleanName, slug },
    });

    return newCircle;
  }

  static toggleMembership(circleId: string, userId: string): { is_member: boolean; member_count: number } {
    const state = db.getState();
    const circle = state.circles.find(c => c.id === circleId || c.slug === circleId);
    if (!circle) throw new Error("Circle not found.");

    const existingIndex = state.circle_members.findIndex(
      cm => cm.circle_id === circle.id && cm.user_id === userId
    );

    let is_member = false;
    if (existingIndex > -1) {
      if (circle.owner_id === userId) {
        throw new Error("Circle owner cannot leave their own Circle.");
      }
      state.circle_members.splice(existingIndex, 1);
      circle.member_count = Math.max(1, circle.member_count - 1);
      is_member = false;
    } else {
      state.circle_members.push({
        id: `cm_${circle.id}_${userId}`,
        circle_id: circle.id,
        user_id: userId,
        role: "MEMBER",
        joined_at: new Date().toISOString(),
      });
      circle.member_count++;
      is_member = true;
    }

    db.save();
    return { is_member, member_count: circle.member_count };
  }

  static getMembers(circleId: string) {
    const state = db.getState();
    const circle = state.circles.find(c => c.id === circleId || c.slug === circleId);
    if (!circle) return [];

    const members = state.circle_members.filter(cm => cm.circle_id === circle.id);
    return members.map(m => {
      const user = state.users.find(u => u.id === m.user_id);
      const profile = state.profiles.find(p => p.user_id === m.user_id);
      return {
        ...profile,
        username: user?.username || "",
        is_verified: !!user?.is_verified,
        role: m.role,
        joined_at: m.joined_at,
      };
    });
  }
}
