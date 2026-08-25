import { supabaseAdmin } from "@/lib/supabase/admin";
import { Post, Profile, Circle } from "@/types";

export class SearchService {
  static async search(query: string, currentUserId?: string, limit = 20) {
    const clean = (query || "").trim().toLowerCase();

    if (!clean) {
      return {
        posts: [],
        users: [],
        circles: [],
        hashtags: this.getTrendingHashtags(),
      };
    }

    const isTagSearch = clean.startsWith("#");
    const searchTerm = isTagSearch ? clean : `%${clean}%`;

    // 1. Search Users
    const { data: matchedProfiles } = await supabaseAdmin
      .from("profiles")
      .select(`
        *,
        user:users!profiles_user_id_fkey(username, is_verified, is_suspended)
      `)
      .or(`display_name.ilike.%${clean}%,bio.ilike.%${clean}%`)
      .limit(limit);

    const { data: matchedUsersByName } = await supabaseAdmin
      .from("users")
      .select(`
        id,
        username,
        is_verified,
        is_suspended,
        profiles(*)
      `)
      .ilike("username", `%${clean}%`)
      .limit(limit);

    const userMap = new Map<string, any>();

    (matchedProfiles || []).forEach((p: any) => {
      if (p.user && !p.user.is_suspended) {
        userMap.set(p.user_id, {
          ...p,
          username: p.user.username,
          is_verified: p.user.is_verified,
        });
      }
    });

    (matchedUsersByName || []).forEach((u: any) => {
      if (!u.is_suspended && !userMap.has(u.id)) {
        const p = Array.isArray(u.profiles) ? u.profiles[0] : u.profiles;
        if (p) {
          userMap.set(u.id, {
            ...p,
            username: u.username,
            is_verified: u.is_verified,
          });
        }
      }
    });

    const users = Array.from(userMap.values()).slice(0, limit);

    // 2. Search Circles
    const { data: circles } = await supabaseAdmin
      .from("circles")
      .select("*")
      .or(`name.ilike.%${clean}%,slug.ilike.%${clean}%,description.ilike.%${clean}%`)
      .limit(limit);

    // 3. Search Posts
    const { data: postRows } = await supabaseAdmin
      .from("posts")
      .select(`
        *,
        author_profile:profiles!posts_author_id_fkey(*),
        author_user:users!posts_author_id_fkey(username, is_verified, role),
        media(*)
      `)
      .ilike("content", `%${clean}%`)
      .eq("is_moderated", false)
      .order("created_at", { ascending: false })
      .limit(limit);

    const posts: Post[] = (postRows || []).map((r: any) => {
      const p = Array.isArray(r.author_profile) ? r.author_profile[0] : r.author_profile;
      const u = Array.isArray(r.author_user) ? r.author_user[0] : r.author_user;

      return {
        id: r.id,
        author_id: r.author_id,
        circle_id: r.circle_id,
        content: r.content,
        visibility: r.visibility,
        like_count: r.like_count ?? 0,
        comment_count: r.comment_count ?? 0,
        repost_count: r.repost_count ?? 0,
        bookmark_count: r.bookmark_count ?? 0,
        ranking_score: Number(r.ranking_score ?? 0),
        is_moderated: r.is_moderated ?? false,
        created_at: r.created_at,
        updated_at: r.updated_at,
        author: p ? {
          ...p,
          username: u?.username || "user",
          is_verified: u?.is_verified ?? false,
          role: u?.role || "USER",
        } : undefined,
        media: r.media || [],
      };
    });

    return {
      posts,
      users,
      circles: circles || [],
      hashtags: this.getTrendingHashtags(),
    };
  }

  static getTrendingHashtags(): { tag: string; count: number; category: string }[] {
    return [
      { tag: "AIAlignment", count: 342, category: "Artificial Intelligence" },
      { tag: "DistributedSystems", count: 289, category: "Infrastructure" },
      { tag: "DesignSystems", count: 195, category: "UI/UX Engineering" },
      { tag: "QuantumFrontier", count: 142, category: "Quantum Physics" },
      { tag: "AppliedZK", count: 118, category: "Cryptography" },
      { tag: "WebGPU", count: 94, category: "Graphics & Shaders" },
    ];
  }
}
