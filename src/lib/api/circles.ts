import { request } from "./client";
import { Circle, Post } from "@/types";

export interface CreateCircleParams {
  name: string;
  description?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  isPrivate?: boolean;
}

export async function getCircles(): Promise<Circle[]> {
  const res = await request<{ circles: Circle[] }>("/api/v1/circles");
  return res.circles || [];
}

export async function getCircle(slug: string): Promise<{
  circle: Circle;
  members: unknown[];
  feed: { posts: Post[] };
}> {
  return request<{
    circle: Circle;
    members: unknown[];
    feed: { posts: Post[] };
  }>(`/api/v1/circles/${slug}`);
}

export async function createCircle(data: CreateCircleParams): Promise<Circle> {
  return request<Circle>("/api/v1/circles", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function toggleCircleMembership(
  slug: string
): Promise<{ is_member: boolean; member_count: number }> {
  return request<{ is_member: boolean; member_count: number }>(`/api/v1/circles/${slug}/join`, {
    method: "POST",
  });
}
