import { NextRequest } from "next/server";
import { realtimeBus } from "@/server/realtime/event-bus";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversationId, userId, username, isTyping } = body;

    if (!conversationId || !userId) {
      return errorResponse("BAD_REQUEST", "conversationId and userId are required", 400);
    }

    realtimeBus.setTyping(conversationId, userId, username || "Someone", !!isTyping);
    return successResponse({ ok: true });
  } catch (err: any) {
    return errorResponse("TYPING_ERROR", err.message, 400);
  }
}
