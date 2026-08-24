"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Bell, Heart, MessageSquare, Repeat2, UserPlus, 
  AtSign, CheckCheck, Loader2, Sparkles 
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRealtime } from "@/context/RealtimeContext";
import { getNotifications, markAllNotificationsRead } from "@/lib/api";
import { Notification } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";

export default function NotificationsPage() {
  const { user } = useAuth();
  const { resetUnread, latestNotification } = useRealtime();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotificationsList = () => {
    if (!user) return;
    getNotifications()
      .then(setNotifications)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchNotificationsList();
  }, [user]);

  // Prepend new incoming realtime notification
  useEffect(() => {
    if (latestNotification) {
      setNotifications((prev) => {
        if (prev.some((n) => n.id === latestNotification.id)) return prev;
        return [latestNotification, ...prev];
      });
    }
  }, [latestNotification]);

  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      resetUnread();
    } catch (e) {
      console.error(e);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "LIKE":
        return <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />;
      case "COMMENT":
      case "REPLY":
        return <MessageSquare className="w-4 h-4 text-orba-400" />;
      case "FOLLOW":
        return <UserPlus className="w-4 h-4 text-accent-cyan" />;
      case "REPOST":
        return <Repeat2 className="w-4 h-4 text-emerald-400" />;
      case "MENTION":
        return <AtSign className="w-4 h-4 text-accent-purple" />;
      default:
        return <Bell className="w-4 h-4 text-orba-400" />;
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === "likes") return n.type === "LIKE";
    if (filter === "comments") return n.type === "COMMENT" || n.type === "REPLY";
    if (filter === "follows") return n.type === "FOLLOW";
    return true;
  });

  const filterTabs = [
    { id: "all", label: "All Pulses" },
    { id: "likes", label: "Reactions" },
    { id: "comments", label: "Replies" },
    { id: "follows", label: "New Orbits" },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto p-4 flex flex-col gap-5 pb-24 md:pb-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-borderLight pb-3">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-orba-400" />
          <h1 className="text-xl font-bold text-white">Pulse Activity Center</h1>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleMarkAllRead}
          leftIcon={<CheckCheck className="w-3.5 h-3.5" />}
        >
          Mark All Read
        </Button>
      </div>

      {/* Filter Tabs */}
      <Tabs
        tabs={filterTabs}
        activeTab={filter}
        onChange={setFilter}
        variant="pill"
      />

      {/* Notifications Stream */}
      <div className="flex flex-col gap-2.5">
        {isLoading ? (
          <LoadingState text="Receiving pulse stream..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Bell className="w-7 h-7 text-zinc-500" />}
            title="No activity recorded in this trajectory yet"
            description="When someone likes, comments, reposts, or orbits your profile, notifications will appear here in real time."
          />
        ) : (
          filtered.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                notif.read
                  ? "bg-surface-card/60 border-surface-border/60 text-zinc-400"
                  : "bg-surface-elevated/90 border-orba-500/40 text-white shadow-sm"
              }`}
            >
              <div className="p-2 rounded-xl bg-surface-card border border-surface-border shrink-0 mt-0.5">
                {getIcon(notif.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/profile/${notif.actor?.username || "unknown"}`}
                    className="flex items-center gap-2 hover:underline group"
                  >
                    <Avatar
                      src={notif.actor?.avatar_url}
                      alt={notif.actor?.display_name || "Actor"}
                      size="xs"
                    />
                    <span className="text-xs font-semibold text-white group-hover:text-orba-300 transition-colors">
                      {notif.actor?.display_name}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-400">
                      @{notif.actor?.username}
                    </span>
                  </Link>

                  <span className="text-[10px] font-mono text-zinc-500">
                    {new Date(notif.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <p className="text-xs text-zinc-200 mt-1 leading-relaxed">
                  {notif.type === "LIKE" && "liked your Signal."}
                  {notif.type === "COMMENT" && "commented on your Signal."}
                  {notif.type === "REPLY" && "replied to your discussion thread."}
                  {notif.type === "FOLLOW" && "started orbiting your profile."}
                  {notif.type === "REPOST" && "reposted your Signal into their orbit."}
                  {notif.type === "MENTION" && "mentioned you in a Signal."}
                </p>

                {notif.post && (
                  <Link
                    href={`/#${notif.post.id}`}
                    className="block mt-2 p-2.5 rounded-xl bg-surface-card/80 border border-surface-border text-xs text-zinc-300 hover:text-white transition-colors truncate"
                  >
                    "{notif.post.content}"
                  </Link>
                )}
              </div>

              {!notif.read && (
                <div className="w-2 h-2 rounded-full bg-orba-400 mt-2 shrink-0 animate-pulse" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
