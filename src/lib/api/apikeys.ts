import { request } from "./client";
import { ApiKey } from "@/types";

export async function getApiKeys(): Promise<ApiKey[]> {
  const res = await request<{ keys: ApiKey[] }>("/api/v1/apikeys");
  return res.keys || [];
}

export async function createApiKey(
  name: string
): Promise<{ apiKey: ApiKey; rawSecret: string }> {
  return request<{ apiKey: ApiKey; rawSecret: string }>("/api/v1/apikeys", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function revokeApiKey(keyId: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/v1/apikeys?keyId=${keyId}`, {
    method: "DELETE",
  });
}
