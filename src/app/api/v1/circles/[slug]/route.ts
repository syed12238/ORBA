import { NextRequest } from "next/server";
import { CircleService } from "@/server/services/circle.service";
import { FeedService } from "@/server/services/feed.service";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const currentUserId = req.headers.get("x-user-id") || req.nextUrl.searchParams.get("userId") || undefined;
    const circle = await CircleService.getCircleBySlug(params.slug, currentUserId);
    if (!circle) return errorResponse("CIRCLE_NOT_FOUND", "Circle not found", 404);

    const members = await CircleService.getMembers(circle.id);
    const feed = await FeedService.getCircleFeed(circle.id, currentUserId);

    return successResponse({
      circle,
      members,
      feed,
    });
  } catch (err: any) {
    return errorResponse("CIRCLE_FETCH_ERROR", err.message, 500);
  }
}
