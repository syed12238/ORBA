import { db } from "../db";
import { Post, Comment, Media, Visibility } from "@/types";
import { backgroundQueue } from "../workers/queue";
import { realtimeBus } from "../realtime/event-bus";

export class PostService {
  static createPost(authorId: string, data: {
    content: string;
    circleId?: string;
    visibility?: Visibility;
    media?: { url: string; storagePath?: string; mimeType?: string; fileSize?: number; width?: number; height?: number }[];
  }): Post {
    const state = db.getState();
    const content = data.content?.trim();

    if (!content && (!data.media || data.media.length === 0)) {
      throw new Error("Signal must contain text content or media attachment.");
    }

    if (content.length > 2000) {
      throw new Error("Signal content cannot exceed 2,000 characters.");
    }

    const author = state.users.find(u => u.id === authorId);
    if (!author) throw new Error("Author does not exist.");

    const authorProfile = state.profiles.find(p => p.user_id === authorId);

    const postId = `sig_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newPost: Post = {
      id: postId,
      author_id: authorId,
      circle_id: data.circleId || undefined,
      content,
      visibility: data.visibility || "PUBLIC",
      like_count: 0,
      comment_count: 0,
      repost_count: 0,
      bookmark_count: 0,
      ranking_score: 500, // Initial boost for fresh signal
      is_moderated: false,
      created_at: now,
      updated_at: now,
    };

    const postMedia: Media[] = [];
    if (data.media && data.media.length > 0) {
      for (const m of data.media) {
        const mediaRecord: Media = {
          id: `med_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          post_id: postId,
          storage_path: m.storagePath || m.url,
          url: m.url,
          thumbnail_url: m.url,
          mime_type: m.mimeType || "image/jpeg",
          file_size: m.fileSize || 102400,
          width: m.width || 1200,
          height: m.height || 800,
          created_at: now,
        };
        state.media.push(mediaRecord);
        postMedia.push(mediaRecord);

        // Enqueue media optimization
        backgroundQueue.enqueue("MEDIA_PROCESSING", {
          mediaId: mediaRecord.id,
          width: mediaRecord.width,
          height: mediaRecord.height,
        });
      }
    }

    state.posts.unshift(newPost);
    if (authorProfile) {
      authorProfile.posts_count++;
    }

    db.save();

    // Async AI Moderation check
    backgroundQueue.enqueue("AI_MODERATION", {
      targetType: "POST",
      targetId: postId,
      content,
    });

    // Check for mentions @username
    const mentions = content.match(/@([a-zA-Z0-9_]+)/g);
    if (mentions) {
      const mentionedUsernames = mentions.map(m => m.replace("@", "").toLowerCase());
      const recipientIds = state.users
        .filter(u => mentionedUsernames.includes(u.username.toLowerCase()) && u.id !== authorId)
        .map(u => u.id);

      if (recipientIds.length > 0) {
        backgroundQueue.enqueue("NOTIFICATION_FANOUT", {
          recipientIds,
          actorId: authorId,
          type: "MENTION",
          postId,
        });
      }
    }

    // Realtime broadcast to live feed subscribers
    const fullPost = this.enrichPost(newPost, authorId);
    realtimeBus.emitEvent("SIGNAL_COMMENT", { post: fullPost });

    return fullPost;
  }

  static getPostById(postId: string, currentUserId?: string): Post | null {
    const state = db.getState();
    const post = state.posts.find(p => p.id === postId);
    if (!post) return null;
    return this.enrichPost(post, currentUserId);
  }

  static deletePost(postId: string, userId: string): boolean {
    const state = db.getState();
    const postIndex = state.posts.findIndex(p => p.id === postId);
    if (postIndex === -1) throw new Error("Post not found.");

    const post = state.posts[postIndex];
    const user = state.users.find(u => u.id === userId);

    if (post.author_id !== userId && user?.role !== "ADMIN" && user?.role !== "MODERATOR") {
      throw new Error("You do not have permission to delete this signal.");
    }

    state.posts.splice(postIndex, 1);
    
    // Clean up relations
    state.media = state.media.filter(m => m.post_id !== postId);
    state.post_likes = state.post_likes.filter(pl => pl.post_id !== postId);
    state.comments = state.comments.filter(c => c.post_id !== postId);
    state.bookmarks = state.bookmarks.filter(b => b.post_id !== postId);
    state.reposts = state.reposts.filter(r => r.post_id !== postId);

    const authorProfile = state.profiles.find(p => p.user_id === post.author_id);
    if (authorProfile) authorProfile.posts_count = Math.max(0, authorProfile.posts_count - 1);

    db.save();

    backgroundQueue.enqueue("AUDIT_LOG_RECORD", {
      actorId: userId,
      action: "SIGNAL_DELETE",
      resourceType: "POST",
      resourceId: postId,
    });

    return true;
  }

  static toggleLike(postId: string, userId: string): { liked: boolean; like_count: number } {
    const state = db.getState();
    const post = state.posts.find(p => p.id === postId);
    if (!post) throw new Error("Signal not found.");

    const existingIndex = state.post_likes.findIndex(
      pl => pl.post_id === postId && pl.user_id === userId
    );

    let liked = false;
    if (existingIndex > -1) {
      // Unlike
      state.post_likes.splice(existingIndex, 1);
      post.like_count = Math.max(0, post.like_count - 1);
      liked = false;
    } else {
      // Like
      state.post_likes.push({
        id: `plk_${Date.now()}`,
        post_id: postId,
        user_id: userId,
        created_at: new Date().toISOString(),
      });
      post.like_count++;
      liked = true;

      // Dispatch notification if not liking own post
      if (post.author_id !== userId) {
        backgroundQueue.enqueue("NOTIFICATION_FANOUT", {
          recipientIds: [post.author_id],
          actorId: userId,
          type: "LIKE",
          postId,
        });
      }
    }

    db.save();
    return { liked, like_count: post.like_count };
  }

  static toggleBookmark(postId: string, userId: string): { bookmarked: boolean; bookmark_count: number } {
    const state = db.getState();
    const post = state.posts.find(p => p.id === postId);
    if (!post) throw new Error("Signal not found.");

    const existingIndex = state.bookmarks.findIndex(
      b => b.post_id === postId && b.user_id === userId
    );

    let bookmarked = false;
    if (existingIndex > -1) {
      state.bookmarks.splice(existingIndex, 1);
      post.bookmark_count = Math.max(0, post.bookmark_count - 1);
      bookmarked = false;
    } else {
      state.bookmarks.push({
        id: `bmk_${Date.now()}`,
        post_id: postId,
        user_id: userId,
        created_at: new Date().toISOString(),
      });
      post.bookmark_count++;
      bookmarked = true;
    }

    db.save();
    return { bookmarked, bookmark_count: post.bookmark_count };
  }

  static toggleRepost(postId: string, userId: string, quoteContent?: string): { reposted: boolean; repost_count: number } {
    const state = db.getState();
    const post = state.posts.find(p => p.id === postId);
    if (!post) throw new Error("Signal not found.");

    const existingIndex = state.reposts.findIndex(
      r => r.post_id === postId && r.user_id === userId
    );

    let reposted = false;
    if (existingIndex > -1 && !quoteContent) {
      state.reposts.splice(existingIndex, 1);
      post.repost_count = Math.max(0, post.repost_count - 1);
      reposted = false;
    } else {
      state.reposts.push({
        id: `rep_${Date.now()}`,
        post_id: postId,
        user_id: userId,
        quote_content: quoteContent?.trim(),
        created_at: new Date().toISOString(),
      });
      post.repost_count++;
      reposted = true;

      if (post.author_id !== userId) {
        backgroundQueue.enqueue("NOTIFICATION_FANOUT", {
          recipientIds: [post.author_id],
          actorId: userId,
          type: "REPOST",
          postId,
        });
      }
    }

    db.save();
    return { reposted, repost_count: post.repost_count };
  }

  static getPostComments(postId: string, currentUserId?: string): Comment[] {
    const state = db.getState();
    const postComments = state.comments.filter(c => c.post_id === postId);

    const enrichComment = (c: Comment): Comment => {
      const author = state.users.find(u => u.id === c.author_id);
      const profile = state.profiles.find(p => p.user_id === c.author_id);
      const has_liked = currentUserId ? state.comment_likes.some(cl => cl.comment_id === c.id && cl.user_id === currentUserId) : false;

      return {
        ...c,
        author: profile && author ? { ...profile, username: author.username, is_verified: author.is_verified } : undefined,
        has_liked,
      };
    };

    // Build hierarchy: root comments with nested replies
    const rootComments = postComments.filter(c => !c.parent_id).map(enrichComment);
    for (const root of rootComments) {
      root.replies = postComments
        .filter(c => c.parent_id === root.id)
        .map(enrichComment)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    return rootComments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  static addComment(postId: string, authorId: string, content: string, parentId?: string): Comment {
    const state = db.getState();
    const post = state.posts.find(p => p.id === postId);
    if (!post) throw new Error("Signal not found.");

    const cleanContent = content.trim();
    if (!cleanContent) throw new Error("Comment cannot be empty.");
    if (cleanContent.length > 1000) throw new Error("Comment cannot exceed 1,000 characters.");

    const commentId = `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newComment: Comment = {
      id: commentId,
      post_id: postId,
      author_id: authorId,
      parent_id: parentId || null,
      content: cleanContent,
      like_count: 0,
      created_at: now,
      updated_at: now,
    };

    state.comments.push(newComment);
    post.comment_count++;
    db.save();

    // Async AI moderation on comment
    backgroundQueue.enqueue("AI_MODERATION", {
      targetType: "COMMENT",
      targetId: commentId,
      content: cleanContent,
    });

    // Notify author of post or parent comment
    const recipientId = parentId 
      ? state.comments.find(c => c.id === parentId)?.author_id 
      : post.author_id;

    if (recipientId && recipientId !== authorId) {
      backgroundQueue.enqueue("NOTIFICATION_FANOUT", {
        recipientIds: [recipientId],
        actorId: authorId,
        type: parentId ? "REPLY" : "COMMENT",
        postId,
        commentId,
      });
    }

    const author = state.users.find(u => u.id === authorId);
    const profile = state.profiles.find(p => p.user_id === authorId);

    return {
      ...newComment,
      author: profile && author ? { ...profile, username: author.username, is_verified: author.is_verified } : undefined,
      has_liked: false,
    };
  }

  static toggleCommentLike(commentId: string, userId: string): { liked: boolean; like_count: number } {
    const state = db.getState();
    const comment = state.comments.find(c => c.id === commentId);
    if (!comment) throw new Error("Comment not found.");

    const existingIndex = state.comment_likes.findIndex(
      cl => cl.comment_id === commentId && cl.user_id === userId
    );

    let liked = false;
    if (existingIndex > -1) {
      state.comment_likes.splice(existingIndex, 1);
      comment.like_count = Math.max(0, comment.like_count - 1);
      liked = false;
    } else {
      state.comment_likes.push({
        id: `cmlk_${Date.now()}`,
        comment_id: commentId,
        user_id: userId,
        created_at: new Date().toISOString(),
      });
      comment.like_count++;
      liked = true;
    }

    db.save();
    return { liked, like_count: comment.like_count };
  }

  public static enrichPost(post: Post, currentUserId?: string): Post {
    const state = db.getState();
    const author = state.users.find(u => u.id === post.author_id);
    const profile = state.profiles.find(p => p.user_id === post.author_id);
    const circle = post.circle_id ? state.circles.find(c => c.id === post.circle_id) : undefined;
    const media = state.media.filter(m => m.post_id === post.id);

    let has_liked = false;
    let has_bookmarked = false;
    let has_reposted = false;

    if (currentUserId) {
      has_liked = state.post_likes.some(pl => pl.post_id === post.id && pl.user_id === currentUserId);
      has_bookmarked = state.bookmarks.some(b => b.post_id === post.id && b.user_id === currentUserId);
      has_reposted = state.reposts.some(r => r.post_id === post.id && r.user_id === currentUserId);
    }

    return {
      ...post,
      author: profile && author ? { ...profile, username: author.username, is_verified: author.is_verified, role: author.role } : undefined,
      circle,
      media,
      has_liked,
      has_bookmarked,
      has_reposted,
    };
  }
}
