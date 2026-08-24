"use client";

import React, { useState, useEffect, useRef } from "react";
import { Message, Conversation } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useRealtime } from "@/context/RealtimeContext";
import { getMessages, sendMessage, markConversationRead } from "@/lib/api";
import { Send, CheckCheck, Loader2, Sparkles } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";

interface ChatWindowProps {
  conversation: Conversation;
  onNewMessageSent?: (msg: Message) => void;
  onBack?: () => void;
}

export function ChatWindow({ conversation, onNewMessageSent, onBack }: ChatWindowProps) {
  const { user } = useAuth();
  const { latestMessage, typingUsers, emitTyping, presences } = useRealtime();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const otherMember =
    conversation.members.find((m) => m.user_id !== user?.id) || conversation.members[0];
  const otherPresence = otherMember
    ? presences[otherMember.user_id] || "OFFLINE"
    : "OFFLINE";
  const isOtherTyping = typingUsers[conversation.id]?.some(
    (name) => name !== user?.profile?.display_name
  );

  // Fetch initial messages for this conversation
  useEffect(() => {
    if (!user) return;
    setIsLoading(true);

    getMessages(conversation.id)
      .then(setMessages)
      .catch(console.error)
      .finally(() => setIsLoading(false));

    markConversationRead(conversation.id).catch(console.error);
  }, [conversation.id, user]);

  // Listen to realtime incoming messages
  useEffect(() => {
    if (latestMessage && latestMessage.conversationId === conversation.id) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === latestMessage.message.id)) return prev;
        return [...prev, latestMessage.message];
      });
      if (user) {
        markConversationRead(conversation.id).catch(console.error);
      }
    }
  }, [latestMessage, conversation.id, user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOtherTyping]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    // Emit typing event
    emitTyping(conversation.id, true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      emitTyping(conversation.id, false);
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user || isSending) return;

    const contentToSend = inputText.trim();
    setInputText("");
    emitTyping(conversation.id, false);

    // Optimistic message
    const tempMessage: Message = {
      id: `temp_${Date.now()}`,
      conversation_id: conversation.id,
      sender_id: user.id,
      content: contentToSend,
      created_at: new Date().toISOString(),
      sender: user.profile ? { ...user.profile, username: user.username } : undefined,
    };
    setMessages((prev) => [...prev, tempMessage]);

    try {
      setIsSending(true);
      const res = await sendMessage(conversation.id, contentToSend);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempMessage.id ? res : m))
      );
      if (onNewMessageSent) onNewMessageSent(res);
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-card border border-surface-borderLight rounded-2xl overflow-hidden shadow-xl">
      {/* Active Conversation Header */}
      <div className="px-5 py-3.5 border-b border-surface-borderLight bg-surface-elevated/80 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar
            src={otherMember?.avatar_url}
            alt={otherMember?.display_name || "User"}
            size="md"
            presence={otherPresence}
          />
          <div className="flex flex-col min-w-0">
            <span className="text-xs sm:text-sm font-semibold text-white tracking-wide truncate">
              {otherMember?.display_name}
            </span>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
              <span>@{otherMember?.username}</span>
              <span>•</span>
              <span
                className={
                  otherPresence === "ONLINE"
                    ? "text-emerald-400 font-medium"
                    : "text-zinc-500"
                }
              >
                {otherPresence === "ONLINE"
                  ? "Active in Orbit"
                  : otherPresence === "AWAY"
                  ? "Away"
                  : "Offline"}
              </span>
            </div>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 px-2.5 py-1 rounded-lg bg-surface-card border border-surface-border">
          <Sparkles className="w-3 h-3 text-orba-400" />
          <span>E2E Transit Sync</span>
        </div>
      </div>

      {/* Message History Stream */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-[300px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-xs text-zinc-400 font-mono">
            <Loader2 className="w-4 h-4 animate-spin text-orba-400 mr-2" />
            Synchronizing message stream...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-zinc-500 italic">
            This conversation is fresh. Send a message to start orbiting!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[78%] ${
                  isMe ? "self-end items-end" : "self-start items-start"
                }`}
              >
                <div
                  className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                    isMe
                      ? "bg-gradient-to-br from-orba-600 to-orba-700 text-white rounded-br-none shadow-md shadow-orba-600/20"
                      : "bg-surface-elevated text-zinc-100 border border-surface-border rounded-bl-none"
                  }`}
                >
                  {msg.content}
                </div>
                <div className="flex items-center gap-1 mt-1 text-[10px] font-mono text-zinc-500 px-1">
                  <span>
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {isMe && <CheckCheck className="w-3 h-3 text-orba-400" />}
                </div>
              </div>
            );
          })
        )}

        {/* Ephemeral Typing Indicator Bubble */}
        {isOtherTyping && (
          <div className="self-start flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-surface-elevated text-xs text-zinc-400 font-mono animate-pulse">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-orba-400 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-orba-400 animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-orba-400 animate-bounce [animation-delay:0.4s]" />
            </div>
            <span>{otherMember?.display_name} is typing...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer Form */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 border-t border-surface-borderLight bg-surface-elevated/50 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          placeholder="Send a real-time message into this orbit..."
          className="flex-1 px-4 py-2.5 rounded-xl bg-surface-card border border-surface-borderLight text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orba-500 transition-colors"
        />
        <Button
          type="submit"
          size="icon"
          isLoading={isSending}
          disabled={!inputText.trim() || isSending}
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
