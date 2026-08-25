"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, TrendingUp, Sparkles, Users, Compass } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getSuggestedUsers, searchAll, toggleFollow } from "@/lib/api";
import { Avatar } from "../ui/Avatar";
import { HashtagTrend, Profile } from "@/types";

export function RightContextPanel() {
  const router = useRouter();
  const { user } = useAuth();
  const { success } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestedUsers, setSuggestedUsers] = useState<(Profile & { username: string })[]>([]);
  const [trendingTags, setTrendingTags] = useState<HashtagTrend[]>([]);
  const [followedMap, setFollowedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (user) {
      getSuggestedUsers(4)
        .then(setSuggestedUsers)
        .catch(console.error);
    }

    searchAll("")
      .then((res) => {
        if (res.hashtags && res.hashtags.length > 0) {
          setTrendingTags(res.hashtags.slice(0, 5));
        }
      })
      .catch(console.error);
  }, [user]);

  const handleFollowToggle = async (targetUsername: string, targetUserId: string) => {
    if (!user) {
      router.push("/login");
      return;
    }
    const currentStatus = !!followedMap[targetUserId];

    // Optimistic toggle
    setFollowedMap((prev) => ({ ...prev, [targetUserId]: !currentStatus }));

    try {
      const res = await toggleFollow(targetUsername);
      setFollowedMap((prev) => ({ ...prev, [targetUserId]: res.is_following }));
      if (res.is_following) {
        success(`Now following @${targetUsername}`);
      }
    } catch {
      setFollowedMap((prev) => ({ ...prev, [targetUserId]: currentStatus }));
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <aside className="hidden lg:flex flex-col gap-5 w-80 xl:w-88 h-screen sticky top-0 px-4 py-6 border-l border-surface-borderLight/40 bg-obsidian/90 backdrop-blur-2xl overflow-y-auto select-none z-20 bg-gradient-mesh">
      {/* Search Input */}
      <form onSubmit={handleSearchSubmit} className="relative group">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-orba-400 transition-colors pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search signals, people, circles..."
          className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-surface-card/80 border border-surface-borderLight/50 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orba-500 focus:ring-1 focus:ring-orba-500/30 transition-all shadow-inner-highlight"
        />
        {searchQuery && (
          <button
            type="submit"
            aria-label="Submit search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-orba-600 text-[10px] font-mono text-white font-medium hover:bg-orba-500 transition-colors"
          >
            ⏎
          </button>
        )}
      </form>

      {/* Suggested People to Follow */}
      <div className="p-4 rounded-2xl glass-card flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-orba-400" />
            Who to Follow
          </span>
          <Link
            href="/explore"
            className="text-[11px] text-orba-400 hover:text-orba-300 transition-colors font-medium"
          >
            Explore
          </Link>
        </div>

        {suggestedUsers.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {suggestedUsers.map((su) => {
              const isFollowed = !!followedMap[su.user_id];
              return (
                <div
                  key={su.user_id}
                  className="flex items-center justify-between gap-3 group"
                >
                  <Link
                    href={`/profile/${su.username}`}
                    className="flex items-center gap-2.5 min-w-0 flex-1"
                  >
                    <Avatar
                      src={su.avatar_url}
                      alt={su.display_name}
                      size="sm"
                      className="border border-surface-border group-hover:border-orba-500 transition-colors"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-white truncate group-hover:text-orba-300 transition-colors">
                        {su.display_name}
                      </span>
                      <span className="text-[11px] text-zinc-400 font-mono truncate">
                        @{su.username}
                      </span>
                    </div>
                  </Link>

                  <button
                    onClick={() => handleFollowToggle(su.username, su.user_id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                      isFollowed
                        ? "bg-surface-elevated text-zinc-400 border border-surface-border hover:bg-rose-950/30 hover:text-rose-300 hover:border-rose-800/30"
                        : "bg-orba-600/20 hover:bg-orba-600 text-orba-300 hover:text-white border border-orba-500/30 font-semibold btn-glow"
                    }`}
                  >
                    {isFollowed ? "Following" : "Follow"}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-2 text-center text-xs text-zinc-500">
            <span>Discover and connect with new members as they join ORBA.</span>
          </div>
        )}
      </div>

      {/* Trending Topics */}
      <div className="p-4 rounded-2xl glass-card flex flex-col gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 font-mono">
          <TrendingUp className="w-3.5 h-3.5 text-accent-cyan" />
          Trending Topics
        </span>

        {trendingTags.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {trendingTags.map((tag) => (
              <Link
                key={tag.tag}
                href={`/explore?q=%23${tag.tag}`}
                className="flex flex-col p-2.5 rounded-xl hover:bg-surface-hover/50 transition-all duration-200 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white group-hover:text-accent-cyan transition-colors">
                    #{tag.tag}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {tag.count} signals
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {tag.category}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-2 text-center text-xs text-zinc-500">
            <span>Hashtags will appear here as topics trend across the network.</span>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-2 pt-2 text-[11px] text-zinc-500 flex flex-wrap gap-x-3 gap-y-1 font-mono">
        <Link href="/settings" className="hover:text-zinc-300">Privacy & Terms</Link>
        <Link href="/circles" className="hover:text-zinc-300">Circles</Link>
        <span>© 2026 ORBA Platform</span>
      </div>
    </aside>
  );
}
