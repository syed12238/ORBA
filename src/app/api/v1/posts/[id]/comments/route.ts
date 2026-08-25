import { NextRequest } from "next/server";
import { PostService } from "@/server/services/post.service";
import { AddCommentSchema } from "@/lib/validators";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentUserId = req.headers.get("x-user-id") || req.nextUrl.searchParams.get("userId") || undefined;
    const comments = await PostService.getPostComments(params.id, currentUserId);
    return successResponse({ comments });
  } catch (err: any) {
    return errorResponse("COMMENTS_FETCH_ERROR", err.message, 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const userId = req.headers.get("x-user-id") || body.userId;
    if (!userId) return errorResponse("UNAUTHORIZED", "Authentication required", 401);

    const parsed = AddCommentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.issues[0].message, 422);
    }

    const comment = await PostService.addComment(params.id, userId, parsed.data.content, parsed.data.parentId);
    return successResponse(comment, 201);
  } catch (err: any) {
    return errorResponse("COMMENT_CREATE_ERROR", err.message, 400);
  }
}
