import { supabaseAdmin } from "@/lib/supabase/admin";
import { Profile, UserSettings } from "@/types";

export class UserService {
  static async getProfileByUsername(
    username: string,
    currentUserId?: string
  ): Promise<(Profile & { username: string; is_verified: boolean; email: string; is_private: boolean; role: string }) | null> {
    const clean = username.toLowerCase().replace("@", "").trim();

    // Query user and joined profile from Supabase PostgreSQL
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select(`
        *,
        profiles(*)
      `)
      .ilike("username", clean)
      .single();

    if (error || !user) return null;

    const profileData = Array.isArray(user.profiles) ? user.profiles[0] : user.profiles;
    if (!profileData) return null;

    let is_following = false;
    let has_pending_follow_request = false;

    if (currentUserId && currentUserId !== user.id) {
      const { data: follow } = await supabaseAdmin
        .from("follows")
        .select("id")
        .eq("follower_id", currentUserId)
        .eq("following_id", user.id)
        .single();
      
      is_following = !!follow;

      if (!is_following && user.is_private) {
        const { data: req } = await supabaseAdmin
          .from("follow_requests")
          .select("id")
          .eq("sender_id", currentUserId)
          .eq("recipient_id", user.id)
          .eq("status", "PENDING")
          .single();
        has_pending_follow_request = !!req;
      }
    }

    return {
      user_id: profileData.user_id,
      display_name: profileData.display_name,
      avatar_url: profileData.avatar_url,
      banner_url: profileData.banner_url,
      bio: profileData.bio,
      website: profileData.website,
      location: profileData.location,
      followers_count: profileData.followers_count ?? 0,
      following_count: profileData.following_count ?? 0,
      posts_count: profileData.posts_count ?? 0,
      created_at: profileData.created_at,
      updated_at: profileData.updated_at,
      username: user.username,
      is_verified: user.is_verified ?? false,
      is_private: user.is_private ?? false,
      email: user.email,
      role: user.role,
      is_following,
      has_pending_follow_request,
    };
  }

  static async updateProfile(
    userId: string,
    data: Partial<Profile & { is_private?: boolean }>
  ): Promise<Profile> {
    const now = new Date().toISOString();
    const updateData: any = { updated_at: now };

    if (data.display_name !== undefined) updateData.display_name = data.display_name.trim();
    if (data.bio !== undefined) updateData.bio = data.bio.trim();
    if (data.avatar_url !== undefined) updateData.avatar_url = data.avatar_url;
    if (data.banner_url !== undefined) updateData.banner_url = data.banner_url;
    if (data.website !== undefined) updateData.website = data.website.trim();
    if (data.location !== undefined) updateData.location = data.location.trim();

    const { data: updated, error } = await supabaseAdmin
      .from("profiles")
      .update(updateData)
      .eq("user_id", userId)
      .select()
      .single();

    if (error || !updated) {
      throw new Error(error?.message || "Failed to update profile.");
    }

    if (data.is_private !== undefined) {
      await supabaseAdmin
        .from("users")
        .update({ is_private: data.is_private, updated_at: now })
        .eq("id", userId);
    }

    return updated;
  }

  static async toggleFollow(
    currentUserId: string,
    targetUserId: string
  ): Promise<{ is_following: boolean; is_pending: boolean }> {
    if (currentUserId === targetUserId) {
      throw new Error("You cannot follow yourself.");
    }

    const { data: targetUser } = await supabaseAdmin
      .from("users")
      .select("id, is_private")
      .eq("id", targetUserId)
      .single();

    if (!targetUser) throw new Error("Target user does not exist.");

    const { data: existingFollow } = await supabaseAdmin
      .from("follows")
      .select("id")
      .eq("follower_id", currentUserId)
      .eq("following_id", targetUserId)
      .single();

    if (existingFollow) {
      // Unfollow
      await supabaseAdmin.from("follows").delete().eq("id", existingFollow.id);
      return { is_following: false, is_pending: false };
    }

    if (targetUser.is_private) {
      const { data: existingReq } = await supabaseAdmin
        .from("follow_requests")
        .select("id")
        .eq("sender_id", currentUserId)
        .eq("recipient_id", targetUserId)
        .eq("status", "PENDING")
        .single();

      if (existingReq) {
        await supabaseAdmin.from("follow_requests").delete().eq("id", existingReq.id);
        return { is_following: false, is_pending: false };
      }

      await supabaseAdmin.from("follow_requests").insert({
        sender_id: currentUserId,
        recipient_id: targetUserId,
        status: "PENDING",
      });

      return { is_following: false, is_pending: true };
    }

    // Insert follow
    await supabaseAdmin.from("follows").insert({
      follower_id: currentUserId,
      following_id: targetUserId,
    });

    // Notify target
    await supabaseAdmin.from("notifications").insert({
      recipient_id: targetUserId,
      actor_id: currentUserId,
      type: "FOLLOW",
    });

    return { is_following: true, is_pending: false };
  }

  static async getFollowers(targetUserId: string, currentUserId?: string) {
    const { data: follows } = await supabaseAdmin
      .from("follows")
      .select(`
        follower:users!follows_follower_id_fkey(
          id,
          username,
          is_verified,
          profiles(*)
        )
      `)
      .eq("following_id", targetUserId);

    if (!follows) return [];

    let myFollowsSet = new Set<string>();
    if (currentUserId) {
      const { data: myFollows } = await supabaseAdmin
        .from("follows")
        .select("following_id")
        .eq("follower_id", currentUserId);
      myFollowsSet = new Set((myFollows || []).map((f: any) => f.following_id));
    }

    return follows
      .filter((f: any) => f.follower)
      .map((f: any) => {
        const u = f.follower;
        const p = Array.isArray(u.profiles) ? u.profiles[0] : u.profiles;
        return {
          user_id: u.id,
          username: u.username,
          is_verified: u.is_verified,
          display_name: p?.display_name || u.username,
          avatar_url: p?.avatar_url || "",
          bio: p?.bio || "",
          followers_count: p?.followers_count || 0,
          following_count: p?.following_count || 0,
          posts_count: p?.posts_count || 0,
          is_following: myFollowsSet.has(u.id),
        };
      });
  }

  static async getFollowing(targetUserId: string, currentUserId?: string) {
    const { data: follows } = await supabaseAdmin
      .from("follows")
      .select(`
        following:users!follows_following_id_fkey(
          id,
          username,
          is_verified,
          profiles(*)
        )
      `)
      .eq("follower_id", targetUserId);

    if (!follows) return [];

    let myFollowsSet = new Set<string>();
    if (currentUserId) {
      const { data: myFollows } = await supabaseAdmin
        .from("follows")
        .select("following_id")
        .eq("follower_id", currentUserId);
      myFollowsSet = new Set((myFollows || []).map((f: any) => f.following_id));
    }

    return follows
      .filter((f: any) => f.following)
      .map((f: any) => {
        const u = f.following;
        const p = Array.isArray(u.profiles) ? u.profiles[0] : u.profiles;
        return {
          user_id: u.id,
          username: u.username,
          is_verified: u.is_verified,
          display_name: p?.display_name || u.username,
          avatar_url: p?.avatar_url || "",
          bio: p?.bio || "",
          followers_count: p?.followers_count || 0,
          following_count: p?.following_count || 0,
          posts_count: p?.posts_count || 0,
          is_following: myFollowsSet.has(u.id),
        };
      });
  }

  static async getSuggestedUsers(currentUserId: string, limit = 5) {
    const { data: follows } = await supabaseAdmin
      .from("follows")
      .select("following_id")
      .eq("follower_id", currentUserId);

    const followingIds = (follows || []).map((f: any) => f.following_id);
    followingIds.push(currentUserId);

    const { data: candidates, error } = await supabaseAdmin
      .from("profiles")
      .select(`
        *,
        users!profiles_user_id_fkey(username, is_verified, is_suspended)
      `)
      .not("user_id", "in", `(${followingIds.map(id => `"${id}"`).join(",")})`)
      .order("followers_count", { ascending: false })
      .limit(limit);

    if (error || !candidates) return [];

    return candidates
      .filter((c: any) => c.users && !c.users.is_suspended)
      .map((c: any) => ({
        user_id: c.user_id,
        username: c.users?.username || "user",
        is_verified: c.users?.is_verified ?? false,
        display_name: c.display_name || c.users?.username || "User",
        avatar_url: c.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${c.users?.username || "orbit"}`,
        bio: c.bio || "",
        followers_count: c.followers_count || 0,
      }));
  }

  static async getUserSettings(userId: string): Promise<UserSettings> {
    const { data: settings } = await supabaseAdmin
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!settings) {
      const defaultSettings: UserSettings = {
        user_id: userId,
        who_can_message: "EVERYONE",
        who_can_mention: "EVERYONE",
        email_notifications: true,
        in_app_notifications: true,
        theme: "DARK",
      };
      await supabaseAdmin.from("user_settings").insert(defaultSettings);
      return defaultSettings;
    }

    return settings;
  }

  static async updateUserSettings(userId: string, newSettings: Partial<UserSettings>): Promise<UserSettings> {
    const { data: updated } = await supabaseAdmin
      .from("user_settings")
      .update({ ...newSettings, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .select()
      .single();

    return updated || this.getUserSettings(userId);
  }
}
