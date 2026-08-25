import { NextRequest } from "next/server";
import { PostService } from "@/server/services/post.service";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentUserId = req.headers.get("x-user-id") || req.nextUrl.searchParams.get("userId") || undefined;
    const post = await PostService.getPostById(params.id, currentUserId);
    if (!post) return errorResponse("POST_NOT_FOUND", "Signal not found", 404);
    return successResponse(post);
  } catch (err: any) {
    return errorResponse("POST_FETCH_ERROR", err.message, 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return errorResponse("UNAUTHORIZED", "Authentication required", 401);

    await PostService.deletePost(params.id, userId);
    return successResponse({ deleted: true, id: params.id });
  } catch (err: any) {
    return errorResponse("POST_DELETE_ERROR", err.message, 400);
  }
}
