import { NextRequest } from "next/server";
import { UserService } from "@/server/services/user.service";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const currentUserId = req.headers.get("x-user-id") || req.nextUrl.searchParams.get("userId") || "u_hamza_001";
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "6", 10);
    const suggested = UserService.getSuggestedUsers(currentUserId, limit);
    return successResponse({ users: suggested });
  } catch (err: any) {
    return errorResponse("SUGGESTED_ERROR", err.message, 500);
  }
}
