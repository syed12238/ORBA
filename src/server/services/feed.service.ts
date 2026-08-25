import { supabaseAdmin } from "@/lib/supabase/admin";
import { Post } from "@/types";

export type FeedFilter = "for_you" | "following" | "trending" | "media";

interface FeedOptions {
  filter?: FeedFilter;
  cursor?: string;
  limit?: number;
}

interface FeedResponse {
  posts: Post[];
  hasMore: boolean;
  nextCursor?: string;
}

function mapPost(row: any, userId?: string): Post {
  const authorUser = Array.isArray(row.author_user)
    ? row.author_user[0]
    : row.author_user || (Array.isArray(row.users) ? row.users[0] : row.users);

  let authorProfile = Array.isArray(row.author_profile)
    ? row.author_profile[0]
    : row.author_profile || (Array.isArray(row.profiles) ? row.profiles[0] : row.profiles);

  if (!authorProfile && authorUser?.profiles) {
    authorProfile = Array.isArray(authorUser.profiles) ? authorUser.profiles[0] : authorUser.profiles;
  }

  const username = authorUser?.username || "orbit_user";
  const displayName = authorProfile?.display_name || username;

  return {
    id: row.id,
    author_id: row.author_id,
    circle_id: row.circle_id,
    content: row.content || "",
    visibility: row.visibility || "PUBLIC",
    like_count: row.like_count ?? 0,
    comment_count: row.comment_count ?? 0,
    repost_count: row.repost_count ?? 0,
    bookmark_count: row.bookmark_count ?? 0,
    ranking_score: Number(row.ranking_score ?? 0),
    is_moderated: row.is_moderated ?? false,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
    author: {
      user_id: authorProfile?.user_id || row.author_id,
      display_name: displayName,
      avatar_url: authorProfile?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`,
      banner_url: authorProfile?.banner_url || "",
      bio: authorProfile?.bio || "",
      website: authorProfile?.website || "",
      location: authorProfile?.location || "",
      followers_count: authorProfile?.followers_count ?? 0,
      following_count: authorProfile?.following_count ?? 0,
      posts_count: authorProfile?.posts_count ?? 0,
      created_at: authorProfile?.created_at || row.created_at,
      updated_at: authorProfile?.updated_at || row.updated_at,
      username,
      is_verified: authorUser?.is_verified ?? false,
      role: authorUser?.role || "USER",
    },
    media: row.media || [],
    has_liked: userId ? (row.liked_by_user ?? false) : false,
    has_reposted: userId ? (row.reposted_by_user ?? false) : false,
    has_bookmarked: userId ? (row.bookmarked_by_user ?? false) : false,
  };
}

export class FeedService {
  static async getHomeFeed(
    currentUserId?: string,
    options?: FeedOptions
  ): Promise<FeedResponse> {
    const filter = options?.filter || "for_you";
    const limit = options?.limit || 15;
    const cursor = options?.cursor;

    // Get followed user IDs if needed
    let followedIds: string[] = [];
    if (currentUserId && filter === "following") {
      const { data: follows } = await supabaseAdmin
        .from("follows")
        .select("following_id")
        .eq("follower_id", currentUserId);
      followedIds = (follows || []).map((f: any) => f.following_id);
      if (followedIds.length === 0) {
        return { posts: [], hasMore: false };
      }
    }

    // Build query with robust nested joins
    let query = supabaseAdmin
      .from("posts")
      .select(`
        *,
        author_user:users!posts_author_id_fkey(
          username,
          is_verified,
          role,
          profiles(*)
        ),
        media(*)
      `)
      .eq("is_moderated", false)
      .eq("visibility", "PUBLIC");

    if (filter === "following" && followedIds.length > 0) {
      query = query.in("author_id", followedIds);
    } else if (filter === "trending") {
      query = query.order("ranking_score", { ascending: false });
    }

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    query = query.order("created_at", { ascending: false }).limit(limit + 1);

    const { data: rows, error } = await query;

    if (error) {
      console.error("Feed query error:", error);
      return { posts: [], hasMore: false };
    }

    let posts = (rows || []).map((r: any) => mapPost(r, currentUserId));

    // Filter media posts after fetch
    if (filter === "media") {
      posts = posts.filter((p) => p.media && p.media.length > 0);
    }

    // Enrich with user-specific status (likes, bookmarks, reposts)
    if (currentUserId && posts.length > 0) {
      const postIds = posts.map((p) => p.id);

      const [{ data: likes }, { data: reposts }, { data: bookmarks }] =
        await Promise.all([
          supabaseAdmin
            .from("post_likes")
            .select("post_id")
            .eq("user_id", currentUserId)
            .in("post_id", postIds),
          supabaseAdmin
            .from("reposts")
            .select("post_id")
            .eq("user_id", currentUserId)
            .in("post_id", postIds),
          supabaseAdmin
            .from("bookmarks")
            .select("post_id")
            .eq("user_id", currentUserId)
            .in("post_id", postIds),
        ]);

      const likedSet = new Set((likes || []).map((l: any) => l.post_id));
      const repostedSet = new Set((reposts || []).map((r: any) => r.post_id));
      const bookmarkedSet = new Set((bookmarks || []).map((b: any) => b.post_id));

      posts = posts.map((p) => ({
        ...p,
        has_liked: likedSet.has(p.id),
        has_reposted: repostedSet.has(p.id),
        has_bookmarked: bookmarkedSet.has(p.id),
      }));
    }

    const hasMore = posts.length > limit;
    if (hasMore) posts.pop();

    const nextCursor =
      hasMore && posts.length > 0 ? posts[posts.length - 1].created_at : undefined;

    return { posts, hasMore, nextCursor };
  }

  static async getBookmarkedPosts(userId: string): Promise<Post[]> {
    const { data: bookmarks } = await supabaseAdmin
      .from("bookmarks")
      .select(`
        post_id,
        posts(
          *,
          author_user:users!posts_author_id_fkey(
            username,
            is_verified,
            role,
            profiles(*)
          ),
          media(*)
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!bookmarks) return [];

    return bookmarks
      .filter((b: any) => b.posts)
      .map((b: any) => mapPost(b.posts, userId));
  }

  static async getCircleFeed(circleId: string, userId?: string): Promise<Post[]> {
    const { data: rows, error } = await supabaseAdmin
      .from("posts")
      .select(`
        *,
        author_user:users!posts_author_id_fkey(
          username,
          is_verified,
          role,
          profiles(*)
        ),
        media(*)
      `)
      .eq("circle_id", circleId)
      .eq("is_moderated", false)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error || !rows) return [];
    return rows.map((r: any) => mapPost(r, userId));
  }

  static async getUserSignals(
    authorId: string,
    currentUserId?: string,
    tab: "posts" | "replies" | "media" | "liked" = "posts"
  ): Promise<Post[]> {
    if (tab === "liked") {
      const { data: likes } = await supabaseAdmin
        .from("post_likes")
        .select(`
          posts(
            *,
            author_user:users!posts_author_id_fkey(
              username,
              is_verified,
              role,
              profiles(*)
            ),
            media(*)
          )
        `)
        .eq("user_id", authorId)
        .order("created_at", { ascending: false })
        .limit(30);

      if (!likes) return [];
      return likes.filter((l: any) => l.posts).map((l: any) => mapPost(l.posts, currentUserId));
    }

    let query = supabaseAdmin
      .from("posts")
      .select(`
        *,
        author_user:users!posts_author_id_fkey(
          username,
          is_verified,
          role,
          profiles(*)
        ),
        media(*)
      `)
      .eq("author_id", authorId)
      .eq("is_moderated", false)
      .order("created_at", { ascending: false })
      .limit(30);

    const { data: rows, error } = await query;
    if (error || !rows) return [];

    let posts = rows.map((r: any) => mapPost(r, currentUserId));
    if (tab === "media") posts = posts.filter((p) => p.media && p.media.length > 0);
    return posts;
  }
}
