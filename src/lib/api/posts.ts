import { request } from "./client";
import { Post, PaginatedFeedResponse, FeedFilter, Visibility } from "@/types";

export interface CreatePostParams {
  content: string;
  circleId?: string;
  visibility?: Visibility;
  media?: { url: string }[];
}

export async function getFeed(params: {
  filter?: FeedFilter;
  limit?: number;
  cursor?: string;
} = {}): Promise<PaginatedFeedResponse> {
  const query = new URLSearchParams();
  if (params.filter) query.set("filter", params.filter);
  if (params.limit) query.set("limit", params.limit.toString());
  if (params.cursor) query.set("cursor", params.cursor);

  return request<PaginatedFeedResponse>(`/api/v1/feed?${query.toString()}`);
}

export async function createPost(data: CreatePostParams): Promise<Post> {
  return request<Post>("/api/v1/posts", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function likePost(postId: string): Promise<{ liked: boolean; like_count: number }> {
  return request<{ liked: boolean; like_count: number }>(`/api/v1/posts/${postId}/like`, {
    method: "POST",
  });
}

export async function bookmarkPost(postId: string): Promise<{ bookmarked: boolean; bookmark_count: number }> {
  return request<{ bookmarked: boolean; bookmark_count: number }>(`/api/v1/posts/${postId}/bookmark`, {
    method: "POST",
  });
}

export async function repostPost(postId: string): Promise<{ reposted: boolean; repost_count: number }> {
  return request<{ reposted: boolean; repost_count: number }>(`/api/v1/posts/${postId}/repost`, {
    method: "POST",
  });
}

export async function reportPost(postId: string, reason: string): Promise<{ id: string }> {
  return request<{ id: string }>("/api/v1/reports", {
    method: "POST",
    body: JSON.stringify({
      targetType: "POST",
      targetId: postId,
      reason,
    }),
  });
}

export async function deletePost(postId: string): Promise<{ deleted: boolean; id: string }> {
  return request<{ deleted: boolean; id: string }>(`/api/v1/posts/${postId}`, {
    method: "DELETE",
  });
}

