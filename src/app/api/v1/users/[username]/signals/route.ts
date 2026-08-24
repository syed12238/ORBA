import { NextRequest } from "next/server";
import { UserService } from "@/server/services/user.service";
import { FeedService } from "@/server/services/feed.service";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: { username: string } }) {
  try {
    const { searchParams } = req.nextUrl;
    const tab = (searchParams.get("tab") || "posts") as "posts" | "replies" | "media" | "liked";
    const currentUserId = req.headers.get("x-user-id") || undefined;

    const profile = UserService.getProfileByUsername(params.username);
    if (!profile) return errorResponse("USER_NOT_FOUND", "User not found", 404);

    const signals = FeedService.getUserSignals(profile.user_id, currentUserId, tab);
    return successResponse({ signals });
  } catch (err: any) {
    return errorResponse("SIGNALS_FETCH_ERROR", err.message, 500);
  }
}
