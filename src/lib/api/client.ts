import { ApiResponse } from "@/types";

export class ApiError extends Error {
  code: string;
  details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }
}

export function getCurrentUserId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const stored = localStorage.getItem("orba_user_id");
  return stored || undefined;
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  
  const currentUserId = getCurrentUserId();
  if (currentUserId && !headers.has("x-user-id")) {
    headers.set("x-user-id", currentUserId);
  }

  if (options.body && typeof options.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const json: ApiResponse<T> = await response.json().catch(() => {
    throw new ApiError("PARSE_ERROR", "Invalid response from server");
  });

  if (json.error) {
    throw new ApiError(json.error.code, json.error.message, json.error.details);
  }

  return json.data as T;
}
