import { db } from "../db";
import { Conversation, Message, Profile } from "@/types";
import { realtimeBus } from "../realtime/event-bus";
import { backgroundQueue } from "../workers/queue";

export class ChatService {
  static getConversations(userId: string): Conversation[] {
    const state = db.getState();
    const userMemberships = state.conversation_members.filter(cm => cm.user_id === userId);
    const convIds = new Set(userMemberships.map(cm => cm.conversation_id));

    const conversations: Conversation[] = [];

    for (const conv of state.conversations.filter(c => convIds.has(c.id))) {
      const allMembers = state.conversation_members.filter(cm => cm.conversation_id === conv.id);
      const memberProfiles: (Profile & { username: string; user_id: string; is_online?: boolean })[] = [];

      for (const m of allMembers) {
        const user = state.users.find(u => u.id === m.user_id);
        const profile = state.profiles.find(p => p.user_id === m.user_id);
        if (user && profile) {
          memberProfiles.push({
            ...profile,
            user_id: user.id,
            username: user.username,
          });
        }
      }

      const convMessages = state.messages
        .filter(msg => msg.conversation_id === conv.id)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      const lastMessage = convMessages[convMessages.length - 1];

      // Calculate unread count for current user
      const myMembership = allMembers.find(m => m.user_id === userId);
      const lastRead = myMembership?.last_read_at ? new Date(myMembership.last_read_at).getTime() : 0;
      const unreadCount = convMessages.filter(
        msg => msg.sender_id !== userId && new Date(msg.created_at).getTime() > lastRead
      ).length;

      conversations.push({
        id: conv.id,
        is_group: conv.is_group,
        name: conv.name,
        last_message_at: conv.last_message_at,
        created_at: conv.created_at,
        members: memberProfiles,
        last_message: lastMessage,
        unread_count: unreadCount,
      });
    }

    return conversations.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
  }

  static getConversationMessages(conversationId: string, userId: string, limit = 50): Message[] {
    const state = db.getState();
    const isMember = state.conversation_members.some(
      cm => cm.conversation_id === conversationId && cm.user_id === userId
    );
    if (!isMember) throw new Error("You are not a member of this conversation.");

    const messages = state.messages
      .filter(m => m.conversation_id === conversationId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(-limit);

    // Enrich messages with sender profile
    return messages.map(m => {
      const senderUser = state.users.find(u => u.id === m.sender_id);
      const senderProfile = state.profiles.find(p => p.user_id === m.sender_id);
      return {
        ...m,
        sender: senderProfile && senderUser ? { ...senderProfile, username: senderUser.username } : undefined,
      };
    });
  }

  static sendMessage(conversationId: string, senderId: string, content: string, mediaUrl?: string): Message {
    const state = db.getState();
    const cleanContent = content.trim();
    if (!cleanContent && !mediaUrl) throw new Error("Message cannot be empty.");

    const isMember = state.conversation_members.some(
      cm => cm.conversation_id === conversationId && cm.user_id === senderId
    );
    if (!isMember) throw new Error("Sender is not a member of this conversation.");

    const conv = state.conversations.find(c => c.id === conversationId);
    if (!conv) throw new Error("Conversation not found.");

    const now = new Date().toISOString();
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newMessage: Message = {
      id: messageId,
      conversation_id: conversationId,
      sender_id: senderId,
      content: cleanContent,
      media_url: mediaUrl || undefined,
      read_at: null,
      created_at: now,
    };

    state.messages.push(newMessage);
    conv.last_message_at = now;

    // Update sender's last read timestamp
    const senderMembership = state.conversation_members.find(
      cm => cm.conversation_id === conversationId && cm.user_id === senderId
    );
    if (senderMembership) {
      senderMembership.last_read_at = now;
    }

    db.save();

    // Prepare enriched message for realtime broadcast
    const senderUser = state.users.find(u => u.id === senderId);
    const senderProfile = state.profiles.find(p => p.user_id === senderId);
    const enrichedMessage = {
      ...newMessage,
      sender: senderProfile && senderUser ? { ...senderProfile, username: senderUser.username } : undefined,
    };

    // Broadcast message to all conversation members
    const otherMembers = state.conversation_members
      .filter(cm => cm.conversation_id === conversationId && cm.user_id !== senderId)
      .map(cm => cm.user_id);

    for (const recipientId of otherMembers) {
      realtimeBus.emitEvent("MESSAGE", {
        conversationId,
        message: enrichedMessage,
      }, recipientId, `conv_${conversationId}`);
    }

    // Stop typing state
    realtimeBus.setTyping(conversationId, senderId, senderUser?.username || "", false);

    return enrichedMessage;
  }

  static startOrGetDirectConversation(currentUserId: string, targetUserId: string): Conversation {
    if (currentUserId === targetUserId) throw new Error("Cannot message yourself.");
    const state = db.getState();

    // Check if 1-on-1 conversation already exists
    const myConvs = state.conversation_members
      .filter(cm => cm.user_id === currentUserId)
      .map(cm => cm.conversation_id);

    for (const cId of myConvs) {
      const conv = state.conversations.find(c => c.id === cId);
      if (conv && !conv.is_group) {
        const members = state.conversation_members.filter(cm => cm.conversation_id === cId);
        if (members.length === 2 && members.some(m => m.user_id === targetUserId)) {
          const allConvs = this.getConversations(currentUserId);
          return allConvs.find(c => c.id === cId)!;
        }
      }
    }

    // Create new conversation
    const newConvId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    state.conversations.push({
      id: newConvId,
      is_group: false,
      last_message_at: now,
      created_at: now,
    });

    state.conversation_members.push(
      { id: `cm_${newConvId}_${currentUserId}`, conversation_id: newConvId, user_id: currentUserId, last_read_at: now, joined_at: now },
      { id: `cm_${newConvId}_${targetUserId}`, conversation_id: newConvId, user_id: targetUserId, last_read_at: now, joined_at: now }
    );

    db.save();

    const allConvs = this.getConversations(currentUserId);
    return allConvs.find(c => c.id === newConvId)!;
  }

  static markAsRead(conversationId: string, userId: string): boolean {
    const state = db.getState();
    const membership = state.conversation_members.find(
      cm => cm.conversation_id === conversationId && cm.user_id === userId
    );
    if (!membership) return false;

    const now = new Date().toISOString();
    membership.last_read_at = now;

    // Mark messages as read
    state.messages
      .filter(m => m.conversation_id === conversationId && m.sender_id !== userId && !m.read_at)
      .forEach(m => { m.read_at = now; });

    db.save();
    return true;
  }
}
