"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, Radio, Flame, Film, Loader2, Plus, LogIn, Compass, Shield } from "lucide-react";
import { Post, FeedFilter } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { getFeed } from "@/lib/api";
import { SignalCard } from "./SignalCard";
import { PostComposer } from "./PostComposer";
import { PostCardSkeleton } from "../ui/Skeleton";
import { EmptyState } from "../ui/EmptyState";
import { ErrorState } from "../ui/ErrorState";
import { Tabs } from "../ui/Tabs";
import { Avatar } from "../ui/Avatar";

export function FeedList() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<FeedFilter>("for_you");
  const [posts, setPosts] = useState<Post[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isModalCreateOpen, setIsModalCreateOpen] = useState(false);

  const fetchFeedData = async (cursor?: string) => {
    try {
      setHasError(false);
      const res = await getFeed({
        filter: activeTab,
        limit: 10,
        cursor,
      });

      if (cursor) {
        setPosts((prev) => [...prev, ...res.posts]);
      } else {
        setPosts(res.posts);
      }
      setNextCursor(res.nextCursor || null);
      setHasMore(!!res.hasMore);
    } catch (err) {
      console.error("Feed fetch error:", err);
      setHasError(true);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchFeedData();
  }, [activeTab, user]);

  const handleLoadMore = () => {
    if (nextCursor && !isLoadingMore) {
      setIsLoadingMore(true);
      fetchFeedData(nextCursor);
    }
  };

  const handlePostCreated = (newPost: Post) => {
    setPosts((prev) => [newPost, ...prev]);
    setIsModalCreateOpen(false);
  };

  const tabs = [
    { id: "for_you", label: "For You", icon: Sparkles },
    { id: "following", label: "Following", icon: Radio },
    { id: "trending", label: "Hot Signals", icon: Flame },
    { id: "media", label: "Media", icon: Film },
  ];

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto pb-24 md:pb-12">
      {/* Sticky Feed Filter Bar */}
      <div className="sticky top-0 md:top-0 bg-obsidian/80 backdrop-blur-2xl border-b border-surface-borderLight/40 flex items-center justify-between px-4 py-1 z-10 select-none">
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={(tabId) => setActiveTab(tabId as FeedFilter)}
        />
      </div>

      {/* Authenticated Composer OR Visitor CTA Card */}
      {user ? (
        <div className="p-4 mx-4 my-4 rounded-2xl bg-gradient-to-br from-surface-card via-surface-card to-surface-subtle border border-surface-borderLight/60 shadow-glass-card flex items-center gap-3 gradient-border">
          <Avatar
            src={profile?.avatar_url}
            alt={profile?.display_name || user.username}
            size="md"
          />
          <button
            onClick={() => setIsModalCreateOpen(true)}
            className="flex-1 text-left px-4 py-3 rounded-xl bg-surface-elevated/80 hover:bg-surface-hover border border-surface-border/60 text-xs text-zinc-500 hover:text-zinc-300 transition-all duration-200 flex items-center justify-between group cursor-pointer"
          >
            <span>What&apos;s orbiting your mind?</span>
            <Plus className="w-4 h-4 text-orba-400 group-hover:scale-110 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>
      ) : (
        <div className="mx-4 my-4 p-5 rounded-2xl bg-gradient-to-br from-surface-card via-[#0e1322] to-surface-card border border-surface-borderLight/50 shadow-glass-elevated relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Ambient background glow */}
          <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-orba-500/8 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-accent-cyan/6 blur-3xl pointer-events-none" />
          <div className="flex flex-col gap-1.5 max-w-md relative z-10">
            <span className="text-sm font-bold text-white tracking-tight flex items-center gap-2 font-sans">
              <Sparkles className="w-4 h-4 text-orba-400" />
              Join the ORBA Network
            </span>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Sign in to publish signals, follow researchers, and join community circles.
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto relative z-10">
            <Link
              href="/login"
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orba-600 to-orba-500 hover:from-orba-500 hover:to-orba-400 text-white text-xs font-bold shadow-glow-orba transition-all duration-200 cursor-pointer whitespace-nowrap btn-glow"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
            <Link
              href="/login?tab=guest"
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface-elevated/80 hover:bg-surface-hover border border-surface-border/60 text-zinc-300 text-xs font-medium transition-all duration-200 cursor-pointer whitespace-nowrap"
            >
              <Compass className="w-3.5 h-3.5 text-zinc-400" />
              <span>Guest</span>
            </Link>
          </div>
        </div>
      )}

      {/* Signals Stream List */}
      <div className="flex flex-col gap-4 px-4">
        {isLoading ? (
          <>
            <PostCardSkeleton />
            <PostCardSkeleton />
            <PostCardSkeleton />
          </>
        ) : hasError ? (
          <ErrorState
            title="Failed to orbit signals"
            message="Could not load the social feed. Please try again."
            onRetry={() => fetchFeedData()}
          />
        ) : posts.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="w-6 h-6 text-orba-400" />}
            title="No signals in this orbit"
            description="Be the first to emit a signal or follow people to populate your feed."
            action={
              user ? (
                <button
                  onClick={() => setIsModalCreateOpen(true)}
                  className="px-4 py-1.5 rounded-full bg-orba-600 hover:bg-orba-500 text-white text-xs font-semibold transition-colors"
                >
                  Emit Signal
                </button>
              ) : (
                <a
                  href="/login"
                  className="px-4 py-1.5 rounded-full bg-orba-600 hover:bg-orba-500 text-white text-xs font-semibold transition-colors"
                >
                  Sign In to Post
                </a>
              )
            }
          />
        ) : (
          posts.map((post) => (
            <SignalCard
              key={post.id}
              post={post}
              onPostDeleted={(postId) =>
                setPosts((prev) => prev.filter((p) => p.id !== postId))
              }
            />
          ))
        )}

        {/* Load More Pagination */}
        {hasMore && (
          <div className="flex justify-center pt-4 pb-8">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="px-6 py-2.5 rounded-xl bg-surface-card hover:bg-surface-elevated border border-surface-borderLight text-xs font-medium text-zinc-300 hover:text-white transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-orba-400" />
                  <span>Loading more signals...</span>
                </>
              ) : (
                <span>Load More Signals</span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Post Composer Modal */}
      {isModalCreateOpen && (
        <PostComposer
          isModal={true}
          onClose={() => setIsModalCreateOpen(false)}
          onPostCreated={handlePostCreated}
        />
      )}
    </div>
  );
}
