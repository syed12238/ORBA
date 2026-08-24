import { request } from "./client";
import { SearchResults } from "@/types";

export async function searchAll(query: string): Promise<SearchResults> {
  const res = await request<SearchResults>(`/api/v1/search?q=${encodeURIComponent(query)}`);
  return {
    posts: res?.posts || [],
    users: res?.users || [],
    circles: res?.circles || [],
    hashtags: res?.hashtags || [],
  };
}
