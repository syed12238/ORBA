import { NextRequest } from "next/server";
import { UserService } from "@/server/services/user.service";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return errorResponse("UNAUTHORIZED", "Authentication required", 401);
    const settings = await UserService.getUserSettings(userId);
    return successResponse(settings);
  } catch (err: any) {
    return errorResponse("SETTINGS_FETCH_ERROR", err.message, 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return errorResponse("UNAUTHORIZED", "Authentication required", 401);

    const body = await req.json();
    const updated = await UserService.updateUserSettings(userId, body);
    return successResponse(updated);
  } catch (err: any) {
    return errorResponse("SETTINGS_UPDATE_ERROR", err.message, 400);
  }
}
