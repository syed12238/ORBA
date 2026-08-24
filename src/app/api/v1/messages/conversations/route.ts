import { NextRequest } from "next/server";
import { ChatService } from "@/server/services/chat.service";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const currentUserId = req.headers.get("x-user-id") || body.currentUserId;
    const targetUserId = body.targetUserId;

    if (!currentUserId || !targetUserId) {
      return errorResponse("BAD_REQUEST", "Both currentUserId and targetUserId are required", 400);
    }

    const conversation = ChatService.startOrGetDirectConversation(currentUserId, targetUserId);
    return successResponse(conversation);
  } catch (err: any) {
    return errorResponse("START_CONVERSATION_ERROR", err.message, 400);
  }
}
