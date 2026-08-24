import { request } from "./client";
import { Comment } from "@/types";

export async function getComments(postId: string): Promise<Comment[]> {
  const res = await request<{ comments: Comment[] }>(`/api/v1/posts/${postId}/comments`);
  return res.comments;
}

export async function addComment(
  postId: string,
  content: string,
  parentId?: string | null
): Promise<Comment> {
  return request<Comment>(`/api/v1/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({
      content,
      parentId: parentId || undefined,
    }),
  });
}

export async function likeComment(
  commentId: string
): Promise<{ liked: boolean; like_count: number }> {
  return request<{ liked: boolean; like_count: number }>(`/api/v1/comments/${commentId}/like`, {
    method: "POST",
  });
}
