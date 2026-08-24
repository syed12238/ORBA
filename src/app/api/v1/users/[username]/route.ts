import { NextRequest } from "next/server";
import { UserService } from "@/server/services/user.service";
import { UpdateProfileSchema } from "@/lib/validators";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: { username: string } }) {
  try {
    const currentUserId = req.headers.get("x-user-id") || req.nextUrl.searchParams.get("currentUserId") || undefined;
    const profile = UserService.getProfileByUsername(params.username, currentUserId);
    if (!profile) return errorResponse("USER_NOT_FOUND", "Profile not found", 404);
    return successResponse(profile);
  } catch (err: any) {
    return errorResponse("PROFILE_FETCH_ERROR", err.message, 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { username: string } }) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return errorResponse("UNAUTHORIZED", "Authentication required", 401);

    const body = await req.json();
    const parsed = UpdateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.issues[0].message, 422);
    }

    const updated = UserService.updateProfile(userId, parsed.data);
    return successResponse(updated);
  } catch (err: any) {
    return errorResponse("PROFILE_UPDATE_ERROR", err.message, 400);
  }
}
