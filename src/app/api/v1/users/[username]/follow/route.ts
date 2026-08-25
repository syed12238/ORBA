import { NextRequest } from "next/server";
import { UserService } from "@/server/services/user.service";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function POST(req: NextRequest, { params }: { params: { username: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const currentUserId = req.headers.get("x-user-id") || body.userId;
    if (!currentUserId) return errorResponse("UNAUTHORIZED", "Authentication required", 401);

    const targetProfile = await UserService.getProfileByUsername(params.username);
    if (!targetProfile) return errorResponse("USER_NOT_FOUND", "Target user not found", 404);

    const result = await UserService.toggleFollow(currentUserId, targetProfile.user_id);
    return successResponse(result);
  } catch (err: any) {
    return errorResponse("FOLLOW_ERROR", err.message, 400);
  }
}

export async function GET(req: NextRequest, { params }: { params: { username: string } }) {
  try {
    const { searchParams } = req.nextUrl;
    const type = searchParams.get("type") || "followers";
    const currentUserId = req.headers.get("x-user-id") || undefined;

    const targetProfile = await UserService.getProfileByUsername(params.username);
    if (!targetProfile) return errorResponse("USER_NOT_FOUND", "Target user not found", 404);

    if (type === "following") {
      const list = await UserService.getFollowing(targetProfile.user_id, currentUserId);
      return successResponse({ users: list });
    }

    const list = await UserService.getFollowers(targetProfile.user_id, currentUserId);
    return successResponse({ users: list });
  } catch (err: any) {
    return errorResponse("FOLLOW_LIST_ERROR", err.message, 500);
  }
}
