"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, Sparkles, TrendingUp, Users2, CheckCircle2, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { searchAll, toggleFollow } from "@/lib/api";
import { SignalCard } from "@/components/feed/SignalCard";
import { SearchResults } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { PostCardSkeleton } from "@/components/ui/Skeleton";
import { LoadingState } from "@/components/ui/LoadingState";

function ExploreContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const { user } = useAuth();
  const { success } = useToast();

  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [results, setResults] = useState<SearchResults>({
    posts: [],
    users: [],
    circles: [],
    hashtags: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [followedMap, setFollowedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(true);
      searchAll(query)
        .then((data) => {
          setResults(data);
          const fMap: Record<string, boolean> = {};
          data.users?.forEach((u) => {
            if (u.is_following) fMap[u.user_id] = true;
          });
          setFollowedMap(fMap);
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const handleFollowToggle = async (targetUsername: string, targetUserId: string) => {
    if (!user) return;
    const current = !!followedMap[targetUserId];
    setFollowedMap((prev) => ({ ...prev, [targetUserId]: !current }));

    try {
      const res = await toggleFollow(targetUsername);
      setFollowedMap((prev) => ({ ...prev, [targetUserId]: res.is_following }));
      if (res.is_following) success(`Orbiting @${targetUsername}`);
    } catch {
      setFollowedMap((prev) => ({ ...prev, [targetUserId]: current }));
    }
  };

  const tabs = [
    { id: "all", label: "Top Trajectories" },
    { id: "signals", label: "Signals", count: results.posts.length },
    { id: "people", label: "Orbits", count: results.users.length },
    { id: "circles", label: "Circles", count: results.circles.length },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto p-4 flex flex-col gap-6 pb-24 md:pb-12">
      {/* Header Search Banner */}
      <div className="flex flex-col gap-3">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-orba-400" />
          Explore the ORBA Network
        </h1>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search signals, @usernames, #hashtags, circles..."
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-surface-card border border-surface-borderLight text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orba-500 transition-all shadow-inner"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="underline"
      />

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Trending Topics Grid (shown in 'all' view) */}
          {(activeTab === "all" || !query) && results.hashtags.length > 0 && (
            <div className="p-4 rounded-2xl bg-surface-card border border-surface-borderLight flex flex-col gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
                <TrendingUp className="w-4 h-4 text-accent-cyan" />
                <span>Active Trajectories</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {results.hashtags.map((tag) => (
                  <button
                    key={tag.tag}
                    onClick={() => setQuery(`#${tag.tag}`)}
                    className="p-3 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-surface-border flex flex-col text-left transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white group-hover:text-accent-cyan transition-colors">
                        #{tag.tag}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {tag.count} signals
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-500">{tag.category}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* People / Users Section */}
          {(activeTab === "all" || activeTab === "people") && results.users.length > 0 && (
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
                People & Researchers
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {results.users.map((u) => {
                  const isFollowed = !!followedMap[u.user_id];
                  return (
                    <div
                      key={u.user_id}
                      className="p-3.5 rounded-2xl bg-surface-card border border-surface-borderLight flex items-start justify-between gap-3"
                    >
                      <Link
                        href={`/profile/${u.username}`}
                        className="flex items-center gap-2.5 min-w-0 flex-1"
                      >
                        <Avatar
                          src={u.avatar_url}
                          alt={u.display_name}
                          size="md"
                        />
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-semibold text-white truncate">
                              {u.display_name}
                            </span>
                            {u.is_verified && (
                              <CheckCircle2 className="w-3 h-3 text-orba-400 shrink-0" />
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-zinc-400">
                            @{u.username}
                          </span>
                          <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                            {u.bio}
                          </p>
                        </div>
                      </Link>
                      <Button
                        size="xs"
                        variant={isFollowed ? "secondary" : "primary"}
                        onClick={() => handleFollowToggle(u.username, u.user_id)}
                        className="shrink-0"
                      >
                        {isFollowed ? "Orbiting" : "Orbit"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Circles Section */}
          {(activeTab === "all" || activeTab === "circles") && results.circles.length > 0 && (
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
                Circles & Communities
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {results.circles.map((c) => (
                  <Link
                    key={c.id}
                    href={`/circles/${c.slug}`}
                    className="p-3.5 rounded-2xl bg-surface-card border border-surface-borderLight hover:border-surface-border transition-colors flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar src={c.avatar_url} alt={c.name} size="md" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-white group-hover:text-orba-300 transition-colors truncate">
                          {c.name}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400">
                          {c.member_count} members
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:translate-x-1 transition-transform" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Signals Section */}
          {(activeTab === "all" || activeTab === "signals") && results.posts.length > 0 && (
            <div className="flex flex-col gap-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
                Matching Signals ({results.posts.length})
              </span>
              {results.posts.map((post) => (
                <SignalCard
                  key={post.id}
                  post={post}
                  onPostDeleted={(id) =>
                    setResults((prev) => ({
                      ...prev,
                      posts: prev.posts.filter((p) => p.id !== id),
                    }))
                  }
                />
              ))}
            </div>
          )}

          {results.posts.length === 0 &&
            results.users.length === 0 &&
            results.circles.length === 0 && (
              <EmptyState
                icon={<Search className="w-7 h-7 text-zinc-500" />}
                title={`No orbits found for "${query}"`}
                description="Try querying a different technical keyword, hashtag (#), or username (@)."
              />
            )}
        </div>
      )}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<LoadingState text="Loading orbital index..." />}>
      <ExploreContent />
    </Suspense>
  );
}
