import { db } from "../db";
import { Post, Profile, Circle } from "@/types";
import { PostService } from "./post.service";

export class SearchService {
  static search(query: string, currentUserId?: string, limit = 20) {
    const state = db.getState();
    const clean = (query || "").trim().toLowerCase();

    if (!clean) {
      return {
        posts: [],
        users: [],
        circles: [],
        hashtags: this.getTrendingHashtags(),
      };
    }

    // 1. Search Users
    const matchedUsers: (Profile & { username: string; is_verified: boolean; is_following?: boolean })[] = [];
    for (const u of state.users) {
      const p = state.profiles.find(pr => pr.user_id === u.id);
      if (
        u.username.toLowerCase().includes(clean) ||
        p?.display_name.toLowerCase().includes(clean) ||
        p?.bio?.toLowerCase().includes(clean)
      ) {
        const is_following = currentUserId ? state.follows.some(f => f.follower_id === currentUserId && f.following_id === u.id) : false;
        matchedUsers.push({
          ...p!,
          username: u.username,
          is_verified: u.is_verified,
          is_following,
        });
      }
    }

    // 2. Search Circles
    const matchedCircles: Circle[] = [];
    for (const c of state.circles) {
      if (
        c.name.toLowerCase().includes(clean) ||
        c.slug.toLowerCase().includes(clean) ||
        c.description?.toLowerCase().includes(clean)
      ) {
        matchedCircles.push(c);
      }
    }

    // 3. Search Posts / Signals
    const isTagSearch = clean.startsWith("#");
    const tagQuery = isTagSearch ? clean.substring(1) : clean;

    const matchedPosts: Post[] = [];
    for (const p of state.posts) {
      const contentLower = p.content.toLowerCase();
      if (isTagSearch) {
        if (contentLower.includes(`#${tagQuery}`)) {
          matchedPosts.push(PostService.enrichPost(p, currentUserId));
        }
      } else {
        if (contentLower.includes(clean)) {
          matchedPosts.push(PostService.enrichPost(p, currentUserId));
        }
      }
    }

    return {
      posts: matchedPosts.slice(0, limit),
      users: matchedUsers.slice(0, limit),
      circles: matchedCircles.slice(0, limit),
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
