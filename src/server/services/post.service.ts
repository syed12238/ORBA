import { supabaseAdmin } from "@/lib/supabase/admin";
import { Post, Comment, Media, Visibility } from "@/types";

function mapPostRow(row: any, currentUserId?: string): Post {
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
    has_liked: currentUserId ? !!row.liked_by_user : false,
    has_bookmarked: currentUserId ? !!row.bookmarked_by_user : false,
    has_reposted: currentUserId ? !!row.reposted_by_user : false,
  };
}

export class PostService {
  static async createPost(
    authorId: string,
    data: {
      content: string;
      circleId?: string;
      visibility?: Visibility;
      media?: { url: string; storagePath?: string; mimeType?: string; fileSize?: number; width?: number; height?: number }[];
    }
  ): Promise<Post> {
    const content = data.content?.trim() || "";

    if (!content && (!data.media || data.media.length === 0)) {
      throw new Error("Signal must contain text content or media attachment.");
    }

    if (content.length > 2000) {
      throw new Error("Signal content cannot exceed 2,000 characters.");
    }

    // Insert post into Supabase
    const { data: newPost, error: postErr } = await supabaseAdmin
      .from("posts")
      .insert({
        author_id: authorId,
        circle_id: data.circleId || null,
        content,
        visibility: data.visibility || "PUBLIC",
        ranking_score: 500,
      })
      .select()
      .single();

    if (postErr || !newPost) {
      throw new Error(`Failed to create post: ${postErr?.message}`);
    }

    // Insert media records
    const insertedMedia: Media[] = [];
    if (data.media && data.media.length > 0) {
      const mediaRows = data.media.map(m => ({
        post_id: newPost.id,
        storage_path: m.storagePath || m.url,
        url: m.url,
        thumbnail_url: m.url,
        mime_type: m.mimeType || "image/jpeg",
        file_size: m.fileSize || 102400,
        width: m.width || 1200,
        height: m.height || 800,
      }));

      const { data: mediaData } = await supabaseAdmin
        .from("media")
        .insert(mediaRows)
        .select();

      if (mediaData) {
        insertedMedia.push(...mediaData);
      }
    }

    // Increment author posts count
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("posts_count")
      .eq("user_id", authorId)
      .single();

    if (profile) {
      await supabaseAdmin
        .from("profiles")
        .update({ posts_count: (profile.posts_count || 0) + 1 })
        .eq("user_id", authorId);
    }

    return this.getPostById(newPost.id, authorId) as Promise<Post>;
  }

  static async getPostById(postId: string, currentUserId?: string): Promise<Post | null> {
    const { data: row, error } = await supabaseAdmin
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
      .eq("id", postId)
      .single();

    if (error || !row) return null;

    const post = mapPostRow(row, currentUserId);

    if (currentUserId) {
      const [{ data: like }, { data: bookmark }, { data: repost }] = await Promise.all([
        supabaseAdmin.from("post_likes").select("id").eq("post_id", postId).eq("user_id", currentUserId).single(),
        supabaseAdmin.from("bookmarks").select("id").eq("post_id", postId).eq("user_id", currentUserId).single(),
        supabaseAdmin.from("reposts").select("id").eq("post_id", postId).eq("user_id", currentUserId).single(),
      ]);

      post.has_liked = !!like;
      post.has_bookmarked = !!bookmark;
      post.has_reposted = !!repost;
    }

    return post;
  }

  static async deletePost(postId: string, userId: string): Promise<boolean> {
    const { data: post, error: fetchErr } = await supabaseAdmin
      .from("posts")
      .select("author_id")
      .eq("id", postId)
      .single();

    if (fetchErr || !post) throw new Error("Signal not found.");

    if (post.author_id !== userId) {
      const { data: user } = await supabaseAdmin
        .from("users")
        .select("role")
        .eq("id", userId)
        .single();

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("user_id", userId)
        .single();

      const role = user?.role || (profile as any)?.role;
      if (role !== "ADMIN" && role !== "MODERATOR") {
        throw new Error("You do not have permission to delete this signal.");
      }
    }

    const { error: deleteErr } = await supabaseAdmin.from("posts").delete().eq("id", postId);
    if (deleteErr) throw deleteErr;

    // Decrement posts count
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("posts_count")
      .eq("user_id", post.author_id)
      .single();

    if (profile && profile.posts_count > 0) {
      await supabaseAdmin
        .from("profiles")
        .update({ posts_count: Math.max(0, profile.posts_count - 1) })
        .eq("user_id", post.author_id);
    }

    return true;
  }

  static async editPost(postId: string, userId: string, content: string): Promise<any> {
    const { data: post, error: fetchErr } = await supabaseAdmin
      .from("posts")
      .select("author_id")
      .eq("id", postId)
      .single();

    if (fetchErr || !post) throw new Error("Signal not found.");

    if (post.author_id !== userId) {
      throw new Error("Only the author can edit this signal.");
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("posts")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", postId)
      .select("*")
      .single();

    if (updateErr) throw updateErr;

    return updated;
  }

  static async toggleLike(
    postId: string,
    userId: string
  ): Promise<{ liked: boolean; like_count: number }> {
    const { data: post } = await supabaseAdmin
      .from("posts")
      .select("author_id, like_count")
      .eq("id", postId)
      .single();

    if (!post) throw new Error("Signal not found.");

    const { data: existingLike } = await supabaseAdmin
      .from("post_likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .single();

    let newCount = post.like_count || 0;
    let liked = false;

    if (existingLike) {
      await supabaseAdmin.from("post_likes").delete().eq("id", existingLike.id);
      newCount = Math.max(0, newCount - 1);
      liked = false;
    } else {
      await supabaseAdmin.from("post_likes").insert({ post_id: postId, user_id: userId });
      newCount = newCount + 1;
      liked = true;

      if (post.author_id !== userId) {
        await supabaseAdmin.from("notifications").insert({
          recipient_id: post.author_id,
          actor_id: userId,
          type: "LIKE",
          post_id: postId,
        });
      }
    }

    await supabaseAdmin.from("posts").update({ like_count: newCount }).eq("id", postId);
    return { liked, like_count: newCount };
  }

  static async toggleBookmark(
    postId: string,
    userId: string
  ): Promise<{ bookmarked: boolean; bookmark_count: number }> {
    const { data: post } = await supabaseAdmin
      .from("posts")
      .select("bookmark_count")
      .eq("id", postId)
      .single();

    if (!post) throw new Error("Signal not found.");

    const { data: existing } = await supabaseAdmin
      .from("bookmarks")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .single();

    let newCount = post.bookmark_count || 0;
    let bookmarked = false;

    if (existing) {
      await supabaseAdmin.from("bookmarks").delete().eq("id", existing.id);
      newCount = Math.max(0, newCount - 1);
      bookmarked = false;
    } else {
      await supabaseAdmin.from("bookmarks").insert({ post_id: postId, user_id: userId });
      newCount = newCount + 1;
      bookmarked = true;
    }

    await supabaseAdmin.from("posts").update({ bookmark_count: newCount }).eq("id", postId);
    return { bookmarked, bookmark_count: newCount };
  }

  static async toggleRepost(
    postId: string,
    userId: string,
    quoteContent?: string
  ): Promise<{ reposted: boolean; repost_count: number }> {
    const { data: post } = await supabaseAdmin
      .from("posts")
      .select("author_id, repost_count")
      .eq("id", postId)
      .single();

    if (!post) throw new Error("Signal not found.");

    const { data: existing } = await supabaseAdmin
      .from("reposts")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .single();

    let newCount = post.repost_count || 0;
    let reposted = false;

    if (existing && !quoteContent) {
      await supabaseAdmin.from("reposts").delete().eq("id", existing.id);
      newCount = Math.max(0, newCount - 1);
      reposted = false;
    } else {
      await supabaseAdmin.from("reposts").insert({
        post_id: postId,
        user_id: userId,
        quote_content: quoteContent?.trim() || null,
      });
      newCount = newCount + 1;
      reposted = true;

      if (post.author_id !== userId) {
        await supabaseAdmin.from("notifications").insert({
          recipient_id: post.author_id,
          actor_id: userId,
          type: "REPOST",
          post_id: postId,
        });
      }
    }

    await supabaseAdmin.from("posts").update({ repost_count: newCount }).eq("id", postId);
    return { reposted, repost_count: newCount };
  }

  static async getPostComments(postId: string, currentUserId?: string): Promise<Comment[]> {
    const { data: rows } = await supabaseAdmin
      .from("comments")
      .select(`
        *,
        author_profile:profiles!comments_author_id_fkey(*),
        author_user:users!comments_author_id_fkey(username, is_verified)
      `)
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (!rows) return [];

    let likedSet = new Set<string>();
    if (currentUserId) {
      const { data: likes } = await supabaseAdmin
        .from("comment_likes")
        .select("comment_id")
        .eq("user_id", currentUserId);
      likedSet = new Set((likes || []).map((l: any) => l.comment_id));
    }

    const comments: Comment[] = rows.map((c: any) => {
      const p = Array.isArray(c.author_profile) ? c.author_profile[0] : c.author_profile;
      const u = Array.isArray(c.author_user) ? c.author_user[0] : c.author_user;
      return {
        id: c.id,
        post_id: c.post_id,
        author_id: c.author_id,
        parent_id: c.parent_id,
        content: c.content,
        like_count: c.like_count ?? 0,
        created_at: c.created_at,
        updated_at: c.updated_at,
        author: p ? {
          ...p,
          username: u?.username || "user",
          is_verified: u?.is_verified ?? false,
        } : undefined,
        has_liked: likedSet.has(c.id),
      };
    });

    const rootComments = comments.filter(c => !c.parent_id);
    for (const root of rootComments) {
      root.replies = comments
        .filter(c => c.parent_id === root.id)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    return rootComments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  static async addComment(
    postId: string,
    authorId: string,
    content: string,
    parentId?: string
  ): Promise<Comment> {
    const cleanContent = content.trim();
    if (!cleanContent) throw new Error("Comment cannot be empty.");
    if (cleanContent.length > 1000) throw new Error("Comment cannot exceed 1,000 characters.");

    const { data: post } = await supabaseAdmin
      .from("posts")
      .select("author_id, comment_count")
      .eq("id", postId)
      .single();

    if (!post) throw new Error("Signal not found.");

    const { data: newComment, error } = await supabaseAdmin
      .from("comments")
      .insert({
        post_id: postId,
        author_id: authorId,
        parent_id: parentId || null,
        content: cleanContent,
      })
      .select(`
        *,
        author_profile:profiles!comments_author_id_fkey(*),
        author_user:users!comments_author_id_fkey(username, is_verified)
      `)
      .single();

    if (error || !newComment) {
      throw new Error(`Failed to add comment: ${error?.message}`);
    }

    // Increment comment count
    await supabaseAdmin
      .from("posts")
      .update({ comment_count: (post.comment_count || 0) + 1 })
      .eq("id", postId);

    // Notify post author
    const recipientId = parentId ? undefined : post.author_id;
    if (recipientId && recipientId !== authorId) {
      await supabaseAdmin.from("notifications").insert({
        recipient_id: recipientId,
        actor_id: authorId,
        type: "COMMENT",
        post_id: postId,
        comment_id: newComment.id,
      });
    }

    const p = Array.isArray(newComment.author_profile) ? newComment.author_profile[0] : newComment.author_profile;
    const u = Array.isArray(newComment.author_user) ? newComment.author_user[0] : newComment.author_user;

    return {
      id: newComment.id,
      post_id: newComment.post_id,
      author_id: newComment.author_id,
      parent_id: newComment.parent_id,
      content: newComment.content,
      like_count: 0,
      created_at: newComment.created_at,
      updated_at: newComment.updated_at,
      author: p ? {
        ...p,
        username: u?.username || "user",
        is_verified: u?.is_verified ?? false,
      } : undefined,
      has_liked: false,
    };
  }

  static async toggleCommentLike(
    commentId: string,
    userId: string
  ): Promise<{ liked: boolean; like_count: number }> {
    const { data: comment } = await supabaseAdmin
      .from("comments")
      .select("like_count")
      .eq("id", commentId)
      .single();

    if (!comment) throw new Error("Comment not found.");

    const { data: existing } = await supabaseAdmin
      .from("comment_likes")
      .select("id")
      .eq("comment_id", commentId)
      .eq("user_id", userId)
      .single();

    let newCount = comment.like_count || 0;
    let liked = false;

    if (existing) {
      await supabaseAdmin.from("comment_likes").delete().eq("id", existing.id);
      newCount = Math.max(0, newCount - 1);
      liked = false;
    } else {
      await supabaseAdmin.from("comment_likes").insert({ comment_id: commentId, user_id: userId });
      newCount = newCount + 1;
      liked = true;
    }

    await supabaseAdmin.from("comments").update({ like_count: newCount }).eq("id", commentId);
    return { liked, like_count: newCount };
  }
}
