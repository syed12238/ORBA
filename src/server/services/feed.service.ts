import { db } from "../db";
import { Post, PaginatedFeedResponse } from "@/types";
import { PostService } from "./post.service";

export type FeedFilter = "for_you" | "following" | "trending" | "media";

export class FeedService {
  static getHomeFeed(
    currentUserId?: string,
    options?: { filter?: FeedFilter; cursor?: string; limit?: number }
  ): PaginatedFeedResponse {
    const state = db.getState();
    const filter = options?.filter || "for_you";
    const limit = options?.limit || 15;
    const now = Date.now();

    // Determine user relationships
    const followedUserIds = new Set(
      currentUserId ? state.follows.filter(f => f.follower_id === currentUserId).map(f => f.following_id) : []
    );
    if (currentUserId) followedUserIds.add(currentUserId);

    const userCircleIds = new Set(
      currentUserId ? state.circle_members.filter(cm => cm.user_id === currentUserId).map(cm => cm.circle_id) : []
    );

    let eligiblePosts = [...state.posts];

    // Filter based on selected mode
    if (filter === "following") {
      eligiblePosts = eligiblePosts.filter(
        p => followedUserIds.has(p.author_id) || (p.circle_id && userCircleIds.has(p.circle_id))
      );
    } else if (filter === "media") {
      const mediaPostIds = new Set(state.media.map(m => m.post_id));
      eligiblePosts = eligiblePosts.filter(p => mediaPostIds.has(p.id));
    }

    // Calculate dynamic scored feed
    const scoredPosts = eligiblePosts.map(post => {
      const ageHours = Math.max(0.05, (now - new Date(post.created_at).getTime()) / (1000 * 60 * 60));
      const recencyScore = 1000 / Math.pow(ageHours + 2, 1.25);
      const engagementScore = post.like_count * 2.5 + post.comment_count * 3.5 + post.repost_count * 4.0;
      
      let relationshipScore = 0;
      if (currentUserId) {
        if (followedUserIds.has(post.author_id)) relationshipScore += 60;
        if (post.circle_id && userCircleIds.has(post.circle_id)) relationshipScore += 40;
        if (post.author_id === currentUserId) relationshipScore += 30;
      }

      const totalScore = filter === "following" 
        ? new Date(post.created_at).getTime() // strictly chronological for following feed
        : recencyScore + engagementScore + relationshipScore;

      return {
        post,
        score: totalScore,
      };
    });

    // Sort by calculated score descending
    scoredPosts.sort((a, b) => b.score - a.score);

    // Apply cursor-based pagination
    let startIndex = 0;
    if (options?.cursor) {
      try {
        const decoded = Buffer.from(options.cursor, "base64").toString("utf-8");
        const foundIndex = scoredPosts.findIndex(sp => sp.post.id === decoded);
        if (foundIndex !== -1) {
          startIndex = foundIndex + 1;
        }
      } catch (e) {
        startIndex = 0;
      }
    }

    const pageSlice = scoredPosts.slice(startIndex, startIndex + limit);
    const enrichedPosts = pageSlice.map(sp => PostService.enrichPost(sp.post, currentUserId));

    const nextPost = scoredPosts[startIndex + limit];
    const nextCursor = nextPost ? Buffer.from(nextPost.post.id).toString("base64") : null;
    const hasMore = startIndex + limit < scoredPosts.length;

    return {
      posts: enrichedPosts,
      nextCursor,
      hasMore,
      totalCount: scoredPosts.length,
    };
  }

  static getUserSignals(
    targetUserId: string,
    currentUserId?: string,
    tab: "posts" | "replies" | "media" | "liked" = "posts"
  ): Post[] {
    const state = db.getState();

    if (tab === "posts") {
      const userPosts = state.posts
        .filter(p => p.author_id === targetUserId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return userPosts.map(p => PostService.enrichPost(p, currentUserId));
    }

    if (tab === "media") {
      const mediaPostIds = new Set(state.media.map(m => m.post_id));
      const userPosts = state.posts
        .filter(p => p.author_id === targetUserId && mediaPostIds.has(p.id))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return userPosts.map(p => PostService.enrichPost(p, currentUserId));
    }

    if (tab === "liked") {
      const likedPostIds = state.post_likes
        .filter(pl => pl.user_id === targetUserId)
        .map(pl => pl.post_id);
      const userPosts = state.posts
        .filter(p => likedPostIds.includes(p.id))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return userPosts.map(p => PostService.enrichPost(p, currentUserId));
    }

    if (tab === "replies") {
      const userCommentedPostIds = new Set(
        state.comments.filter(c => c.author_id === targetUserId).map(c => c.post_id)
      );
      const userPosts = state.posts
        .filter(p => userCommentedPostIds.has(p.id))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return userPosts.map(p => PostService.enrichPost(p, currentUserId));
    }

    return [];
  }

  static getCircleFeed(
    circleId: string,
    currentUserId?: string,
    options?: { cursor?: string; limit?: number }
  ): PaginatedFeedResponse {
    const state = db.getState();
    const limit = options?.limit || 15;

    const circlePosts = state.posts
      .filter(p => p.circle_id === circleId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    let startIndex = 0;
    if (options?.cursor) {
      try {
        const decoded = Buffer.from(options.cursor, "base64").toString("utf-8");
        const found = circlePosts.findIndex(p => p.id === decoded);
        if (found !== -1) startIndex = found + 1;
      } catch (e) {
        startIndex = 0;
      }
    }

    const slice = circlePosts.slice(startIndex, startIndex + limit);
    const enriched = slice.map(p => PostService.enrichPost(p, currentUserId));
    const nextPost = circlePosts[startIndex + limit];
    const nextCursor = nextPost ? Buffer.from(nextPost.id).toString("base64") : null;

    return {
      posts: enriched,
      nextCursor,
      hasMore: startIndex + limit < circlePosts.length,
      totalCount: circlePosts.length,
    };
  }

  static getBookmarkedPosts(userId: string): Post[] {
    const state = db.getState();
    const bookmarkedIds = state.bookmarks
      .filter(b => b.user_id === userId)
      .map(b => b.post_id);

    const posts = state.posts
      .filter(p => bookmarkedIds.includes(p.id))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return posts.map(p => PostService.enrichPost(p, userId));
  }
}
