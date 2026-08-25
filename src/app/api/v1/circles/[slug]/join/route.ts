import { NextRequest } from "next/server";
import { CircleService } from "@/server/services/circle.service";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = req.headers.get("x-user-id") || body.userId;
    if (!userId) return errorResponse("UNAUTHORIZED", "Authentication required", 401);

    const result = await CircleService.toggleMembership(params.slug, userId);
    return successResponse(result);
  } catch (err: any) {
    return errorResponse("CIRCLE_JOIN_ERROR", err.message, 400);
  }
}
