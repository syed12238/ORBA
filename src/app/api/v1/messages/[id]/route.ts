import { NextRequest } from "next/server";
import { ChatService } from "@/server/services/chat.service";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = req.headers.get("x-user-id") || req.nextUrl.searchParams.get("userId");
    if (!userId) return errorResponse("UNAUTHORIZED", "Authentication required", 401);

    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50", 10);
    const messages = ChatService.getConversationMessages(params.id, userId, limit);
    return successResponse({ messages });
  } catch (err: any) {
    return errorResponse("MESSAGES_FETCH_ERROR", err.message, 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return errorResponse("UNAUTHORIZED", "Authentication required", 401);

    const result = ChatService.markAsRead(params.id, userId);
    return successResponse({ marked: result });
  } catch (err: any) {
    return errorResponse("MARK_READ_ERROR", err.message, 400);
  }
}
