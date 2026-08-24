import { supabaseAdmin } from "@/lib/supabase/admin";
import { User, Profile } from "@/types";

export class AuthService {
  /**
   * Synchronizes or provisions a user record and profile in Supabase PostgreSQL.
   */
  static async syncSupabaseUser(data: {
    supabaseId: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
  }): Promise<{ user: User; profile: Profile }> {
    const cleanEmail = data.email.trim().toLowerCase();
    const now = new Date().toISOString();

    // 1. Check if user exists in Supabase PostgreSQL
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", data.supabaseId)
      .single();

    if (existingUser) {
      // User exists — fetch/ensure profile
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("user_id", existingUser.id)
        .single();

      let profile = existingProfile;

      if (!profile) {
        // Create profile if missing
        const newProfile = {
          user_id: existingUser.id,
          display_name: data.displayName || existingUser.username,
          avatar_url:
            data.avatarUrl ||
            `https://api.dicebear.com/7.x/identicon/svg?seed=${existingUser.username}`,
          banner_url:
            "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80",
          bio: "Orbital pioneer on ORBA.",
          website: "",
          location: "",
          followers_count: 0,
          following_count: 0,
          posts_count: 0,
        };
        const { data: created } = await supabaseAdmin
          .from("profiles")
          .insert(newProfile)
          .select()
          .single();
        profile = created;
      } else if (
        data.avatarUrl &&
        (!profile.avatar_url || profile.avatar_url.includes("dicebear"))
      ) {
        await supabaseAdmin
          .from("profiles")
          .update({ avatar_url: data.avatarUrl, updated_at: now })
          .eq("user_id", existingUser.id);
        profile = { ...profile, avatar_url: data.avatarUrl };
      }

      const user: User = {
        id: existingUser.id,
        email: existingUser.email,
        username: existingUser.username,
        role: existingUser.role,
        is_verified: existingUser.is_verified,
        is_private: existingUser.is_private,
        is_suspended: existingUser.is_suspended,
        created_at: existingUser.created_at,
        updated_at: existingUser.updated_at,
      };

      const profileOut: Profile = {
        user_id: profile!.user_id,
        display_name: profile!.display_name,
        avatar_url: profile!.avatar_url,
        banner_url: profile!.banner_url,
        bio: profile!.bio,
        website: profile!.website,
        location: profile!.location,
        followers_count: profile!.followers_count ?? 0,
        following_count: profile!.following_count ?? 0,
        posts_count: profile!.posts_count ?? 0,
        created_at: profile!.created_at,
        updated_at: profile!.updated_at,
      };

      return { user, profile: profileOut };
    }

    // 2. New user — generate username and create record
    let baseUsername = (data.displayName || cleanEmail.split("@")[0])
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "");

    if (baseUsername.length < 3) baseUsername = `user_${baseUsername || "orbit"}`;
    if (baseUsername.length > 25) baseUsername = baseUsername.slice(0, 25);

    // Ensure unique username
    let uniqueUsername = baseUsername;
    let counter = 1;
    while (true) {
      const { data: taken } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("username", uniqueUsername)
        .single();
      if (!taken) break;
      uniqueUsername = `${baseUsername}_${counter < 10 ? `0${counter}` : counter}`;
      counter++;
    }

    // Insert user
    const newUserData = {
      id: data.supabaseId,
      email: cleanEmail,
      username: uniqueUsername,
      password_hash: "",
      role: "USER",
      is_verified: true,
      is_private: false,
      is_suspended: false,
    };

    const { data: createdUser, error: userErr } = await supabaseAdmin
      .from("users")
      .insert(newUserData)
      .select()
      .single();

    if (userErr || !createdUser) {
      throw new Error(`Failed to create user: ${userErr?.message}`);
    }

    // Insert profile
    const newProfileData = {
      user_id: data.supabaseId,
      display_name: data.displayName || uniqueUsername,
      avatar_url:
        data.avatarUrl ||
        `https://api.dicebear.com/7.x/identicon/svg?seed=${uniqueUsername}`,
      banner_url:
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80",
      bio: "Orbital pioneer on ORBA.",
      website: "",
      location: "",
      followers_count: 0,
      following_count: 0,
      posts_count: 0,
    };

    const { data: createdProfile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .insert(newProfileData)
      .select()
      .single();

    if (profileErr || !createdProfile) {
      throw new Error(`Failed to create profile: ${profileErr?.message}`);
    }

    // Initialize user settings
    await supabaseAdmin.from("user_settings").insert({ user_id: data.supabaseId }).select();

    const user: User = {
      id: createdUser.id,
      email: createdUser.email,
      username: createdUser.username,
      role: createdUser.role,
      is_verified: createdUser.is_verified,
      is_private: createdUser.is_private,
      is_suspended: createdUser.is_suspended,
      created_at: createdUser.created_at,
      updated_at: createdUser.updated_at,
    };

    const profile: Profile = {
      user_id: createdProfile.user_id,
      display_name: createdProfile.display_name,
      avatar_url: createdProfile.avatar_url,
      banner_url: createdProfile.banner_url,
      bio: createdProfile.bio,
      website: createdProfile.website,
      location: createdProfile.location,
      followers_count: 0,
      following_count: 0,
      posts_count: 0,
      created_at: createdProfile.created_at,
      updated_at: createdProfile.updated_at,
    };

    return { user, profile };
  }

  /**
   * Get user + profile by Supabase user ID
   */
  static async getUserById(
    userId: string
  ): Promise<{ user: User; profile: Profile } | null> {
    const { data: u } = await supabaseAdmin
      .from("users")
      .select("*, profiles(*)")
      .eq("id", userId)
      .single();

    if (!u) return null;

    const profile = Array.isArray(u.profiles) ? u.profiles[0] : u.profiles;
    if (!profile) return null;

    return {
      user: {
        id: u.id,
        email: u.email,
        username: u.username,
        role: u.role,
        is_verified: u.is_verified,
        is_private: u.is_private,
        is_suspended: u.is_suspended,
        created_at: u.created_at,
        updated_at: u.updated_at,
      },
      profile: {
        user_id: profile.user_id,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        banner_url: profile.banner_url,
        bio: profile.bio,
        website: profile.website,
        location: profile.location,
        followers_count: profile.followers_count ?? 0,
        following_count: profile.following_count ?? 0,
        posts_count: profile.posts_count ?? 0,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      },
    };
  }
}
