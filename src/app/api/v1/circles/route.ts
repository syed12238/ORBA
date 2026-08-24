import { NextRequest } from "next/server";
import { CircleService } from "@/server/services/circle.service";
import { CreateCircleSchema } from "@/lib/validators";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const currentUserId = req.headers.get("x-user-id") || req.nextUrl.searchParams.get("userId") || undefined;
    const circles = CircleService.getCircles(currentUserId);
    return successResponse({ circles });
  } catch (err: any) {
    return errorResponse("CIRCLES_FETCH_ERROR", err.message, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return errorResponse("UNAUTHORIZED", "Authentication required", 401);

    const body = await req.json();
    const parsed = CreateCircleSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.issues[0].message, 422);
    }

    const circle = CircleService.createCircle(userId, parsed.data);
    return successResponse(circle, 201);
  } catch (err: any) {
    return errorResponse("CIRCLE_CREATE_ERROR", err.message, 400);
  }
}
