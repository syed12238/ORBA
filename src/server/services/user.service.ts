import { db } from "../db";
import { Profile, User, UserSettings } from "@/types";
import { backgroundQueue } from "../workers/queue";
import { realtimeBus } from "../realtime/event-bus";

export class UserService {
  static getProfileByUsername(username: string, currentUserId?: string): (Profile & { username: string; is_verified: boolean; email: string; is_private: boolean; role: string }) | null {
    const state = db.getState();
    const clean = username.toLowerCase().replace("@", "");
    const user = state.users.find(u => u.username.toLowerCase() === clean);
    if (!user) return null;

    const profile = state.profiles.find(p => p.user_id === user.id);
    if (!profile) return null;

    let is_following = false;
    let has_pending_follow_request = false;

    if (currentUserId && currentUserId !== user.id) {
      is_following = state.follows.some(f => f.follower_id === currentUserId && f.following_id === user.id);
      has_pending_follow_request = state.follow_requests.some(
        fr => fr.sender_id === currentUserId && fr.recipient_id === user.id && fr.status === "PENDING"
      );
    }

    return {
      ...profile,
      username: user.username,
      is_verified: user.is_verified,
      is_private: user.is_private,
      email: user.email,
      role: user.role,
      is_following,
      has_pending_follow_request,
    };
  }

  static updateProfile(userId: string, data: Partial<Profile & { is_private?: boolean }>): Profile {
    const state = db.getState();
    const profile = state.profiles.find(p => p.user_id === userId);
    if (!profile) throw new Error("Profile not found.");

    if (data.display_name) profile.display_name = data.display_name.trim();
    if (data.bio !== undefined) profile.bio = data.bio.trim();
    if (data.avatar_url) profile.avatar_url = data.avatar_url;
    if (data.banner_url) profile.banner_url = data.banner_url;
    if (data.website !== undefined) profile.website = data.website.trim();
    if (data.location !== undefined) profile.location = data.location.trim();
    profile.updated_at = new Date().toISOString();

    if (data.is_private !== undefined) {
      const user = state.users.find(u => u.id === userId);
      if (user) {
        user.is_private = data.is_private;
      }
    }

    db.save();

    backgroundQueue.enqueue("AUDIT_LOG_RECORD", {
      actorId: userId,
      action: "PROFILE_UPDATE",
      resourceType: "PROFILE",
      resourceId: userId,
    });

    return profile;
  }

  static toggleFollow(currentUserId: string, targetUserId: string): { is_following: boolean; is_pending: boolean } {
    if (currentUserId === targetUserId) {
      throw new Error("You cannot orbit or follow yourself.");
    }

    const state = db.getState();
    const targetUser = state.users.find(u => u.id === targetUserId);
    if (!targetUser) throw new Error("Target user does not exist.");

    const existingIndex = state.follows.findIndex(
      f => f.follower_id === currentUserId && f.following_id === targetUserId
    );

    const currentUserProfile = state.profiles.find(p => p.user_id === currentUserId);
    const targetProfile = state.profiles.find(p => p.user_id === targetUserId);

    if (existingIndex > -1) {
      // Unfollow
      state.follows.splice(existingIndex, 1);
      if (currentUserProfile) currentUserProfile.following_count = Math.max(0, currentUserProfile.following_count - 1);
      if (targetProfile) targetProfile.followers_count = Math.max(0, targetProfile.followers_count - 1);

      db.save();
      return { is_following: false, is_pending: false };
    }

    // Check if target is private account
    if (targetUser.is_private) {
      const existingReq = state.follow_requests.find(
        fr => fr.sender_id === currentUserId && fr.recipient_id === targetUserId && fr.status === "PENDING"
      );
      if (existingReq) {
        // Cancel request
        const reqIdx = state.follow_requests.indexOf(existingReq);
        state.follow_requests.splice(reqIdx, 1);
        db.save();
        return { is_following: false, is_pending: false };
      }

      state.follow_requests.push({
        id: `freq_${Date.now()}`,
        sender_id: currentUserId,
        recipient_id: targetUserId,
        status: "PENDING",
        created_at: new Date().toISOString(),
      });

      // Notify target of follow request
      backgroundQueue.enqueue("NOTIFICATION_FANOUT", {
        recipientIds: [targetUserId],
        actorId: currentUserId,
        type: "FOLLOW",
      });

      db.save();
      return { is_following: false, is_pending: true };
    }

    // Public follow
    state.follows.push({
      id: `fol_${Date.now()}`,
      follower_id: currentUserId,
      following_id: targetUserId,
      created_at: new Date().toISOString(),
    });

    if (currentUserProfile) currentUserProfile.following_count++;
    if (targetProfile) targetProfile.followers_count++;

    // Asynchronously dispatch notification
    backgroundQueue.enqueue("NOTIFICATION_FANOUT", {
      recipientIds: [targetUserId],
      actorId: currentUserId,
      type: "FOLLOW",
    });

    db.save();
    return { is_following: true, is_pending: false };
  }

  static getFollowers(targetUserId: string, currentUserId?: string) {
    const state = db.getState();
    const followerIds = state.follows
      .filter(f => f.following_id === targetUserId)
      .map(f => f.follower_id);

    return followerIds.map(fId => {
      const user = state.users.find(u => u.id === fId);
      const profile = state.profiles.find(p => p.user_id === fId);
      const is_following = currentUserId ? state.follows.some(f => f.follower_id === currentUserId && f.following_id === fId) : false;
      return {
        ...profile,
        username: user?.username || "",
        is_verified: !!user?.is_verified,
        is_following,
      };
    }).filter(Boolean);
  }

  static getFollowing(targetUserId: string, currentUserId?: string) {
    const state = db.getState();
    const followingIds = state.follows
      .filter(f => f.follower_id === targetUserId)
      .map(f => f.following_id);

    return followingIds.map(fId => {
      const user = state.users.find(u => u.id === fId);
      const profile = state.profiles.find(p => p.user_id === fId);
      const is_following = currentUserId ? state.follows.some(f => f.follower_id === currentUserId && f.following_id === fId) : false;
      return {
        ...profile,
        username: user?.username || "",
        is_verified: !!user?.is_verified,
        is_following,
      };
    }).filter(Boolean);
  }

  static getSuggestedUsers(currentUserId: string, limit = 5) {
    const state = db.getState();
    const followingIds = new Set(
      state.follows.filter(f => f.follower_id === currentUserId).map(f => f.following_id)
    );
    followingIds.add(currentUserId);

    const candidates = state.users
      .filter(u => !followingIds.has(u.id) && !u.is_suspended)
      .map(u => {
        const profile = state.profiles.find(p => p.user_id === u.id);
        return {
          ...profile,
          user_id: u.id,
          username: u.username,
          is_verified: u.is_verified,
          display_name: profile?.display_name || u.username,
          avatar_url: profile?.avatar_url || "",
          bio: profile?.bio || "",
          followers_count: profile?.followers_count || 0,
        };
      })
      .sort((a, b) => b.followers_count - a.followers_count)
      .slice(0, limit);

    return candidates;
  }

  static getUserSettings(userId: string): UserSettings {
    const state = db.getState();
    let settings = state.user_settings.find(s => s.user_id === userId);
    if (!settings) {
      settings = {
        user_id: userId,
        who_can_message: "EVERYONE",
        who_can_mention: "EVERYONE",
        email_notifications: true,
        in_app_notifications: true,
        theme: "DARK",
      };
      state.user_settings.push(settings);
      db.save();
    }
    return settings;
  }

  static updateUserSettings(userId: string, newSettings: Partial<UserSettings>): UserSettings {
    const state = db.getState();
    const settings = this.getUserSettings(userId);
    Object.assign(settings, newSettings);
    db.save();
    return settings;
  }
}
