import { request } from "./client";
import { UserSettings } from "@/types";

export async function getUserSettings(): Promise<UserSettings> {
  return request<UserSettings>("/api/v1/users/settings");
}

export async function updateUserSettings(
  settings: Partial<UserSettings>
): Promise<UserSettings> {
  return request<UserSettings>("/api/v1/users/settings", {
    method: "PATCH",
    body: JSON.stringify(settings),
  });
}
