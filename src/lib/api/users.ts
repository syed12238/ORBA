import { request } from "./client";
import { Profile, UserProfileFull, Post } from "@/types";

export async function getProfile(username: string): Promise<UserProfileFull> {
  return request<UserProfileFull>(`/api/v1/users/${username}`);
}

export async function getUserSignals(
  username: string,
  tab: "posts" | "replies" | "media" | "liked" = "posts"
): Promise<Post[]> {
  const res = await request<{ signals: Post[] }>(`/api/v1/users/${username}/signals?tab=${tab}`);
  return res.signals || [];
}

export async function updateProfile(
  username: string,
  data: Partial<Profile>
): Promise<Profile> {
  return request<Profile>(`/api/v1/users/${username}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function toggleFollow(
  username: string
): Promise<{ is_following: boolean; followers_count: number }> {
  return request<{ is_following: boolean; followers_count: number }>(`/api/v1/users/${username}/follow`, {
    method: "POST",
  });
}

export async function getFollowList(
  username: string,
  type: "followers" | "following"
): Promise<(Profile & { username: string })[]> {
  const res = await request<{ users: (Profile & { username: string })[] }>(
    `/api/v1/users/${username}/follow?type=${type}`
  );
  return res.users || [];
}

export async function getSuggestedUsers(limit = 4): Promise<(Profile & { username: string })[]> {
  const res = await request<{ users: (Profile & { username: string })[] }>(
    `/api/v1/users/suggested?limit=${limit}`
  );
  return res.users || [];
}
