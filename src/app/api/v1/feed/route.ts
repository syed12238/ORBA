import { NextRequest } from "next/server";
import { FeedService, FeedFilter } from "@/server/services/feed.service";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const filter = (searchParams.get("filter") || "for_you") as FeedFilter;
    const cursor = searchParams.get("cursor") || undefined;
    const limit = parseInt(searchParams.get("limit") || "15", 10);
    const userId = req.headers.get("x-user-id") || searchParams.get("userId") || undefined;

    if (filter === "bookmarks" as any) {
      if (!userId) return errorResponse("UNAUTHORIZED", "Authentication required to view bookmarks", 401);
      const posts = await FeedService.getBookmarkedPosts(userId);
      return successResponse({ posts, hasMore: false });
    }

    const feedData = await FeedService.getHomeFeed(userId, { filter, cursor, limit });
    return successResponse(feedData);
  } catch (err: any) {
    console.error("Feed error:", err);
    return errorResponse("FEED_FETCH_ERROR", err.message || "Failed to load feed", 500);
  }
}
