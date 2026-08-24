import { request } from "./client";
import { Conversation, Message } from "@/types";

export async function getConversations(): Promise<Conversation[]> {
  const res = await request<{ conversations: Conversation[] }>("/api/v1/messages");
  return res.conversations || [];
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const res = await request<{ messages: Message[] }>(`/api/v1/messages/${conversationId}`);
  return res.messages || [];
}

export async function sendMessage(
  conversationId: string,
  content: string,
  mediaUrl?: string
): Promise<Message> {
  return request<Message>("/api/v1/messages", {
    method: "POST",
    body: JSON.stringify({
      conversationId,
      content,
      mediaUrl,
    }),
  });
}

export async function startConversation(targetUserId: string): Promise<Conversation> {
  return request<Conversation>("/api/v1/messages/conversations", {
    method: "POST",
    body: JSON.stringify({
      targetUserId,
    }),
  });
}

export async function markConversationRead(conversationId: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/v1/messages/${conversationId}`, {
    method: "POST",
  });
}
