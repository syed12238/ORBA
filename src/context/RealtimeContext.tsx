"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
import { Notification, Message } from "@/types";

interface RealtimeContextType {
  isConnected: boolean;
  unreadCount: number;
  latestNotification: Notification | null;
  latestMessage: { conversationId: string; message: Message } | null;
  typingUsers: Record<string, string[]>; // conversationId -> array of usernames
  presences: Record<string, "ONLINE" | "AWAY" | "OFFLINE">;
  emitTyping: (conversationId: string, isTyping: boolean) => Promise<void>;
  decrementUnread: () => void;
  resetUnread: () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNotification, setLatestNotification] = useState<Notification | null>(null);
  const [latestMessage, setLatestMessage] = useState<{ conversationId: string; message: Message } | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [presences, setPresences] = useState<Record<string, "ONLINE" | "AWAY" | "OFFLINE">>({});

  // Fetch initial unread count on login
  useEffect(() => {
    if (!user) return;
    fetch("/api/v1/notifications", {
      headers: { "x-user-id": user.id }
    })
      .then(res => res.json())
      .then(json => {
        if (json.data?.unreadCount !== undefined) {
          setUnreadCount(json.data.unreadCount);
        }
      })
      .catch(console.error);
  }, [user]);

  // Connect to SSE stream
  useEffect(() => {
    if (!user) return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      eventSource = new EventSource(`/api/v1/realtime?userId=${user.id}`);

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          handleRealtimePayload(payload);
        } catch (e) {
          // ignore heartbeats
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        if (eventSource) {
          eventSource.close();
        }
        reconnectTimeout = setTimeout(connectSSE, 4000);
      };
    };

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [user]);

  const handleRealtimePayload = useCallback((payload: any) => {
    switch (payload.type) {
      case "CONNECTED":
        if (payload.data?.presences) {
          setPresences(prev => ({ ...prev, ...payload.data.presences }));
        }
        break;

      case "NOTIFICATION":
        const notif: Notification = payload.data?.notification;
        if (notif) {
          setUnreadCount(prev => prev + 1);
          setLatestNotification(notif);
          const actorName = notif.actor?.display_name || "Someone";
          const actionText = 
            notif.type === "LIKE" ? "liked your signal" :
            notif.type === "COMMENT" ? "commented on your signal" :
            notif.type === "REPLY" ? "replied to your comment" :
            notif.type === "FOLLOW" ? "started orbiting your profile" :
            notif.type === "REPOST" ? "reposted your signal" :
            notif.type === "MENTION" ? "mentioned you in a signal" : "sent an interaction";

          toast(`${actorName} ${actionText}`, "info", "Pulse Notification");
        } else if (payload.data?.type === "SYSTEM_BROADCAST") {
          toast(payload.data.message, "info", payload.data.title || "ORBA Broadcast");
        }
        break;

      case "MESSAGE":
        if (payload.data?.message) {
          setLatestMessage({
            conversationId: payload.data.conversationId,
            message: payload.data.message,
          });
          if (payload.data.message.sender_id !== user?.id) {
            toast(
              `${payload.data.message.sender?.display_name || "Someone"}: ${payload.data.message.content.substring(0, 45)}...`,
              "info",
              "Direct Message"
            );
          }
        }
        break;

      case "TYPING":
        const { conversationId, username, isTyping } = payload.data;
        if (conversationId && username) {
          setTypingUsers(prev => {
            const current = prev[conversationId] || [];
            const updated = isTyping
              ? Array.from(new Set([...current, username]))
              : current.filter(u => u !== username);
            return { ...prev, [conversationId]: updated };
          });
        }
        break;

      case "PRESENCE":
        const { userId: presUserId, status } = payload.data;
        if (presUserId && status) {
          setPresences(prev => ({ ...prev, [presUserId]: status }));
        }
        break;

      default:
        break;
    }
  }, [user, toast]);

  const emitTyping = async (conversationId: string, isTyping: boolean) => {
    if (!user) return;
    try {
      await fetch("/api/v1/realtime/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          userId: user.id,
          username: user.profile?.display_name || user.username,
          isTyping,
        }),
      });
    } catch (e) {
      console.error("Failed to emit typing presence:", e);
    }
  };

  const decrementUnread = () => setUnreadCount(prev => Math.max(0, prev - 1));
  const resetUnread = () => setUnreadCount(0);

  return (
    <RealtimeContext.Provider
      value={{
        isConnected,
        unreadCount,
        latestNotification,
        latestMessage,
        typingUsers,
        presences,
        emitTyping,
        decrementUnread,
        resetUnread,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) throw new Error("useRealtime must be used within a RealtimeProvider");
  return context;
}
