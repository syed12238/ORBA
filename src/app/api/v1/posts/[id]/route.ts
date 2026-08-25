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
    const userId = req.headers.get("x-user-id") || req.nextUrl.searchParams.get("userId");
    if (!userId) return errorResponse("UNAUTHORIZED", "Authentication required", 401);

    await PostService.deletePost(params.id, userId);
    return successResponse({ deleted: true, id: params.id });
  } catch (err: any) {
    return errorResponse("POST_DELETE_ERROR", err.message, 400);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = req.headers.get("x-user-id") || req.nextUrl.searchParams.get("userId");
    if (!userId) return errorResponse("UNAUTHORIZED", "Authentication required", 401);

    const body = await req.json();
    const { content } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return errorResponse("INVALID_INPUT", "Content is required", 400);
    }

    if (content.length > 2000) {
      return errorResponse("INVALID_INPUT", "Content must be 2000 characters or less", 400);
    }

    const updated = await PostService.editPost(params.id, userId, content.trim());
    return successResponse(updated);
  } catch (err: any) {
    return errorResponse("POST_EDIT_ERROR", err.message, 400);
  }
}

