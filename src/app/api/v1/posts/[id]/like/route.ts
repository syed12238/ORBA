import { NextRequest } from "next/server";
import { PostService } from "@/server/services/post.service";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = req.headers.get("x-user-id") || body.userId;
    if (!userId) return errorResponse("UNAUTHORIZED", "Authentication required", 401);

    const result = PostService.toggleLike(params.id, userId);
    return successResponse(result);
  } catch (err: any) {
    return errorResponse("LIKE_ERROR", err.message, 400);
  }
}
