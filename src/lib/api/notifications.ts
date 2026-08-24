import { request } from "./client";
import { Notification } from "@/types";

export async function getNotifications(): Promise<Notification[]> {
  const res = await request<{ notifications: Notification[] }>("/api/v1/notifications");
  return res.notifications || [];
}

export async function markAllNotificationsRead(): Promise<{ success: boolean }> {
  return request<{ success: boolean }>("/api/v1/notifications", {
    method: "POST",
    body: JSON.stringify({}),
  });
}
