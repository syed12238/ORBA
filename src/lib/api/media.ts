import { getCurrentUserId, ApiError } from "./client";

export async function uploadMedia(file: File): Promise<{ url: string; id?: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const currentUserId = getCurrentUserId();
  const headers = new Headers();
  if (currentUserId) {
    headers.set("x-user-id", currentUserId);
  }

  const res = await fetch("/api/v1/media", {
    method: "POST",
    headers,
    body: formData,
  });

  const json = await res.json().catch(() => {
    throw new ApiError("UPLOAD_ERROR", "Failed to parse upload response");
  });

  if (json.error) {
    throw new ApiError(json.error.code, json.error.message);
  }

  return json.data;
}
