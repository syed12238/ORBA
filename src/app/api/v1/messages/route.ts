import { NextRequest } from "next/server";
import { ChatService } from "@/server/services/chat.service";
import { SendMessageSchema } from "@/lib/validators";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id") || req.nextUrl.searchParams.get("userId");
    if (!userId) return errorResponse("UNAUTHORIZED", "Authentication required", 401);

    const conversations = ChatService.getConversations(userId);
    return successResponse({ conversations });
  } catch (err: any) {
    return errorResponse("CONVERSATIONS_FETCH_ERROR", err.message, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = req.headers.get("x-user-id") || body.senderId;
    if (!userId) return errorResponse("UNAUTHORIZED", "Authentication required", 401);

    const parsed = SendMessageSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.issues[0].message, 422);
    }

    const message = ChatService.sendMessage(
      parsed.data.conversationId,
      userId,
      parsed.data.content,
      parsed.data.mediaUrl
    );

    return successResponse(message, 201);
  } catch (err: any) {
    return errorResponse("SEND_MESSAGE_ERROR", err.message, 400);
  }
}
