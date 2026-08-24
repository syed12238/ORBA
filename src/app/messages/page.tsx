"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRealtime } from "@/context/RealtimeContext";
import { Conversation } from "@/types";
import { getConversations, startConversation, getSuggestedUsers, searchAll } from "@/lib/api";
import { ChatWindow } from "@/components/messages/ChatWindow";
import { MessageSquare, Plus, Search, Sparkles, ArrowLeft, Loader2, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";

export default function MessagesPage() {
  const { user } = useAuth();
  const { presences, latestMessage } = useRealtime();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [candidateUsers, setCandidateUsers] = useState<any[]>([]);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);

  const fetchConversationsList = () => {
    if (!user) return;
    getConversations()
      .then((convs) => {
        setConversations(convs);
        if (!selectedConvId && convs.length > 0) {
          setSelectedConvId(convs[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchConversationsList();
  }, [user]);

  useEffect(() => {
    if (isNewModalOpen && user) {
      setIsLoadingCandidates(true);
      if (candidateSearch.trim()) {
        searchAll(candidateSearch.trim())
          .then((res) => {
            setCandidateUsers((res.users || []).filter((u: any) => u.user_id !== user.id));
          })
          .catch(console.error)
          .finally(() => setIsLoadingCandidates(false));
      } else {
        getSuggestedUsers(15)
          .then((users) => {
            setCandidateUsers(users.filter((u: any) => u.user_id !== user.id));
          })
          .catch(console.error)
          .finally(() => setIsLoadingCandidates(false));
      }
    }
  }, [isNewModalOpen, candidateSearch, user]);

  // Update conversation last message when realtime message arrives
  useEffect(() => {
    if (latestMessage) {
      setConversations((prev) => {
        return prev
          .map((c) => {
            if (c.id === latestMessage.conversationId) {
              return {
                ...c,
                last_message: latestMessage.message,
                last_message_at: latestMessage.message.created_at,
                unread_count:
                  selectedConvId === c.id ? 0 : (c.unread_count || 0) + 1,
              };
            }
            return c;
          })
          .sort(
            (a, b) =>
              new Date(b.last_message_at).getTime() -
              new Date(a.last_message_at).getTime()
          );
      });
    }
  }, [latestMessage, selectedConvId]);

  const handleStartConversation = async (targetUserId: string) => {
    if (!user) return;
    try {
      const conv = await startConversation(targetUserId);
      setIsNewModalOpen(false);
      fetchConversationsList();
      setSelectedConvId(conv.id);
    } catch (e) {
      console.error(e);
    }
  };

  const selectedConversation = conversations.find((c) => c.id === selectedConvId);

  const filteredConversations = conversations.filter((c) => {
    const other = c.members.find((m) => m.user_id !== user?.id);
    if (!searchFilter.trim()) return true;
    return (
      other?.display_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      other?.username.toLowerCase().includes(searchFilter.toLowerCase())
    );
  });

  if (!user) {
    return (
      <div className="w-full min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-center mb-4 text-orba-400">
          <MessageSquare className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white mb-1">Direct Messages</h2>
        <p className="text-xs text-zinc-400 max-w-sm mb-4">
          Please sign in to access your direct message threads and real-time chat.
        </p>
        <Button onClick={() => (window.location.href = "/login")}>Sign In</Button>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-4rem)] p-4 flex gap-4 max-w-5xl mx-auto pb-20 md:pb-4">
      {/* Conversations Sidebar List */}
      <div
        className={`w-full md:w-80 flex-shrink-0 flex flex-col gap-3 rounded-2xl bg-surface-card border border-surface-borderLight p-3.5 ${
          selectedConvId ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-orba-400" />
            Direct Messages
          </h2>
          <Button
            size="icon-sm"
            variant="primary"
            onClick={() => setIsNewModalOpen(true)}
            aria-label="Start new conversation"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-surface-elevated border border-surface-border text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orba-500"
          />
        </div>

        {/* Conversations Stream */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1">
          {isLoading ? (
            <LoadingState text="Loading threads..." />
          ) : filteredConversations.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center gap-2 text-zinc-500 text-xs">
              <MessageSquare className="w-8 h-8 stroke-1 text-zinc-600" />
              <span>No conversations yet.</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsNewModalOpen(true)}
              >
                Start a New Chat
              </Button>
            </div>
          ) : (
            filteredConversations.map((c) => {
              const other = c.members.find((m) => m.user_id !== user?.id);
              const isSelected = c.id === selectedConvId;
              const presence = other ? presences[other.user_id] : undefined;

              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedConvId(c.id)}
                  className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left w-full cursor-pointer ${
                    isSelected
                      ? "bg-orba-600/20 border border-orba-500/30 text-white"
                      : "hover:bg-surface-hover/70 text-zinc-300 border border-transparent"
                  }`}
                >
                  <Avatar
                    src={other?.avatar_url}
                    alt={other?.display_name || "User"}
                    size="md"
                    presence={
                      presence}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-white truncate">
                        {other?.display_name || other?.username || "Conversation"}
                      </span>
                      {c.last_message_at && (
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {new Date(c.last_message_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                      {c.last_message?.content || "No messages yet"}
                    </p>
                  </div>

                  {c.unread_count && c.unread_count > 0 ? (
                    <span className="w-4 h-4 rounded-full bg-orba-500 text-white font-mono text-[10px] font-bold flex items-center justify-center">
                      {c.unread_count}
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Active Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedConversation ? (
          <div className="flex-1 flex flex-col h-full">
            <div className="md:hidden flex items-center gap-2 mb-2">
              <button
                onClick={() => setSelectedConvId(null)}
                className="p-2 rounded-xl bg-surface-card border border-surface-border text-zinc-400"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-zinc-300">
                Back to inbox
              </span>
            </div>

            <ChatWindow
              conversation={selectedConversation}
              onBack={() => setSelectedConvId(null)}
            />
          </div>
        ) : (
          <div className="hidden md:flex flex-1 flex-col items-center justify-center rounded-2xl bg-surface-card border border-surface-borderLight p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-surface-elevated flex items-center justify-center mb-3">
              <MessageSquare className="w-6 h-6 text-orba-400" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">
              Select a conversation
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm">
              Communicate in real-time with members across the ORBA social network.
            </p>
          </div>
        )}
      </div>

      {/* New Conversation Modal */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Start a Direct Message"
        description="Search for a member to start a live conversation thread."
      >
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              value={candidateSearch}
              onChange={(e) => setCandidateSearch(e.target.value)}
              placeholder="Search by name or @username..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-surface-elevated border border-surface-border text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orba-500"
            />
          </div>

          <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto">
            {isLoadingCandidates ? (
              <div className="py-6 text-center text-xs text-zinc-500">
                <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1 text-orba-400" />
                <span>Searching members...</span>
              </div>
            ) : candidateUsers.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-500">
                <span>No members found.</span>
              </div>
            ) : (
              candidateUsers.map((u) => (
                <button
                  key={u.user_id || u.id}
                  onClick={() => handleStartConversation(u.user_id || u.id)}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-surface-border transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar src={u.avatar_url} alt={u.display_name} size="sm" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-white truncate">
                        {u.display_name}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        @{u.username}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-orba-400 font-medium">Message →</span>
                </button>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
