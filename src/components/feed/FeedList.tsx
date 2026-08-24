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
      <div className="sticky top-0 md:top-0 bg-obsidian/90 backdrop-blur-xl border-b border-surface-borderLight flex items-center justify-between px-4 py-1 z-10 select-none">
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={(tabId) => setActiveTab(tabId as FeedFilter)}
        />
      </div>

      {/* Authenticated Composer OR Visitor CTA Card */}
      {user ? (
        <div className="p-4 mx-4 my-4 rounded-2xl bg-surface-card border border-surface-borderLight shadow-sm flex items-center gap-3">
          <Avatar
            src={profile?.avatar_url}
            alt={profile?.display_name || user.username}
            size="md"
          />
          <button
            onClick={() => setIsModalCreateOpen(true)}
            className="flex-1 text-left px-4 py-3 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-surface-border text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center justify-between group cursor-pointer"
          >
            <span>What's orbiting your mind? (Supports #hashtags and @mentions)</span>
            <Plus className="w-4 h-4 text-orba-400 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      ) : (
        <div className="mx-4 my-4 p-5 rounded-2xl bg-gradient-to-br from-surface-card via-[#0e1322] to-surface-card border border-surface-borderLight shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1 max-w-md">
            <span className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5 font-sans">
              <Sparkles className="w-4 h-4 text-orba-400" />
              Join the conversation on ORBA
            </span>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Sign in with Google or continue as a guest to publish signals, follow researchers, and join circles.
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Link
              href="/login"
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-orba-600 hover:bg-orba-500 text-white text-xs font-semibold shadow-lg shadow-orba-500/20 transition-all cursor-pointer whitespace-nowrap"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
            <Link
              href="/login?tab=guest"
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-surface-border text-zinc-300 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
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
            icon={Sparkles}
            title="No signals in this orbit"
            description="Be the first to emit a signal or follow people to populate your feed."
            actionLabel={user ? "Emit Signal" : "Sign In to Post"}
            onAction={() => {
              if (user) {
                setIsModalCreateOpen(true);
              } else {
                window.location.href = "/login";
              }
            }}
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
