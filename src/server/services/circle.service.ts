import { supabaseAdmin } from "@/lib/supabase/admin";
import { Circle, CircleRole } from "@/types";

export class CircleService {
  static async getCircles(currentUserId?: string): Promise<Circle[]> {
    const { data: circles, error } = await supabaseAdmin
      .from("circles")
      .select(`
        *,
        owner:users!circles_owner_id_fkey(
          username,
          profiles(*)
        )
      `)
      .order("member_count", { ascending: false });

    if (error || !circles) return [];

    let myMemberships = new Map<string, CircleRole>();
    if (currentUserId) {
      const { data: members } = await supabaseAdmin
        .from("circle_members")
        .select("circle_id, role")
        .eq("user_id", currentUserId);

      if (members) {
        members.forEach((m: any) => myMemberships.set(m.circle_id, m.role as CircleRole));
      }
    }

    return circles.map((c: any) => {
      const ownerUser = c.owner;
      const ownerProfile = ownerUser ? (Array.isArray(ownerUser.profiles) ? ownerUser.profiles[0] : ownerUser.profiles) : undefined;
      const userRole = myMemberships.get(c.id);

      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        avatar_url: c.avatar_url,
        banner_url: c.banner_url,
        owner_id: c.owner_id,
        member_count: c.member_count ?? 1,
        is_private: c.is_private ?? false,
        created_at: c.created_at,
        updated_at: c.updated_at,
        is_member: myMemberships.has(c.id),
        user_role: userRole,
        owner: ownerProfile ? { ...ownerProfile, username: ownerUser?.username || "owner" } : undefined,
      };
    });
  }

  static async getCircleBySlug(slug: string, currentUserId?: string): Promise<Circle | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

    let query = supabaseAdmin
      .from("circles")
      .select(`
        *,
        owner:users!circles_owner_id_fkey(
          username,
          profiles(*)
        )
      `);

    if (isUuid) {
      query = query.or(`id.eq.${slug},slug.eq.${slug}`);
    } else {
      query = query.eq("slug", slug);
    }

    const { data: circle, error } = await query.single();
    if (error || !circle) return null;

    let isMember = false;
    let userRole: CircleRole | undefined;

    if (currentUserId) {
      const { data: membership } = await supabaseAdmin
        .from("circle_members")
        .select("role")
        .eq("circle_id", circle.id)
        .eq("user_id", currentUserId)
        .single();

      if (membership) {
        isMember = true;
        userRole = membership.role as CircleRole;
      }
    }

    const ownerUser = circle.owner;
    const ownerProfile = ownerUser ? (Array.isArray(ownerUser.profiles) ? ownerUser.profiles[0] : ownerUser.profiles) : undefined;

    return {
      id: circle.id,
      name: circle.name,
      slug: circle.slug,
      description: circle.description,
      avatar_url: circle.avatar_url,
      banner_url: circle.banner_url,
      owner_id: circle.owner_id,
      member_count: circle.member_count ?? 1,
      is_private: circle.is_private ?? false,
      created_at: circle.created_at,
      updated_at: circle.updated_at,
      is_member: isMember,
      user_role: userRole,
      owner: ownerProfile ? { ...ownerProfile, username: ownerUser?.username || "owner" } : undefined,
    };
  }

  static async createCircle(
    ownerId: string,
    data: {
      name: string;
      description: string;
      avatarUrl?: string;
      bannerUrl?: string;
      isPrivate?: boolean;
    }
  ): Promise<Circle> {
    const cleanName = data.name.trim();
    if (cleanName.length < 3 || cleanName.length > 50) {
      throw new Error("Circle name must be between 3 and 50 characters.");
    }

    const slug = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const { data: existing } = await supabaseAdmin
      .from("circles")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existing) {
      throw new Error(`A Circle with slug "${slug}" already exists.`);
    }

    const { data: newCircle, error } = await supabaseAdmin
      .from("circles")
      .insert({
        name: cleanName,
        slug,
        description: data.description?.trim() || "",
        avatar_url: data.avatarUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=256&auto=format&fit=crop&q=80",
        banner_url: data.bannerUrl || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&auto=format&fit=crop&q=80",
        owner_id: ownerId,
        member_count: 1,
        is_private: !!data.isPrivate,
      })
      .select()
      .single();

    if (error || !newCircle) {
      throw new Error(`Failed to create circle: ${error?.message}`);
    }

    await supabaseAdmin.from("circle_members").insert({
      circle_id: newCircle.id,
      user_id: ownerId,
      role: "OWNER",
    });

    return newCircle;
  }

  static async toggleMembership(
    circleId: string,
    userId: string
  ): Promise<{ is_member: boolean; member_count: number }> {
    const circle = await this.getCircleBySlug(circleId);
    if (!circle) throw new Error("Circle not found.");

    const { data: existing } = await supabaseAdmin
      .from("circle_members")
      .select("id, role")
      .eq("circle_id", circle.id)
      .eq("user_id", userId)
      .single();

    let is_member = false;
    let newCount = circle.member_count;

    if (existing) {
      if (circle.owner_id === userId) {
        throw new Error("Circle owner cannot leave their own Circle.");
      }
      await supabaseAdmin.from("circle_members").delete().eq("id", existing.id);
      newCount = Math.max(1, newCount - 1);
      is_member = false;
    } else {
      await supabaseAdmin.from("circle_members").insert({
        circle_id: circle.id,
        user_id: userId,
        role: "MEMBER",
      });
      newCount = newCount + 1;
      is_member = true;
    }

    await supabaseAdmin.from("circles").update({ member_count: newCount }).eq("id", circle.id);
    return { is_member, member_count: newCount };
  }

  static async getMembers(circleId: string) {
    const circle = await this.getCircleBySlug(circleId);
    if (!circle) return [];

    const { data: members } = await supabaseAdmin
      .from("circle_members")
      .select(`
        role,
        joined_at,
        user:users!circle_members_user_id_fkey(
          username,
          is_verified,
          profiles(*)
        )
      `)
      .eq("circle_id", circle.id);

    if (!members) return [];

    return members
      .filter((m: any) => m.user)
      .map((m: any) => {
        const u = m.user;
        const p = Array.isArray(u.profiles) ? u.profiles[0] : u.profiles;
        return {
          ...p,
          username: u.username || "",
          is_verified: !!u.is_verified,
          role: m.role,
          joined_at: m.joined_at,
        };
      });
  }
}
