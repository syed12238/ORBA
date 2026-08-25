"use client";

import React, { useState, useEffect } from "react";
import { Bookmark } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getFeed } from "@/lib/api";
import { SignalCard } from "@/components/feed/SignalCard";
import { Post } from "@/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { PostCardSkeleton } from "@/components/ui/Skeleton";

export default function BookmarksPage() {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getFeed({ filter: "bookmarks" })
      .then((res) => {
        setBookmarks(res.posts || []);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [user]);

  return (
    <div className="w-full max-w-2xl mx-auto p-4 flex flex-col gap-5 pb-24 md:pb-12">
      <div className="flex items-center gap-2 border-b border-surface-borderLight pb-3">
        <Bookmark className="w-5 h-5 text-amber-400 fill-amber-400/20" />
        <div>
          <h1 className="text-xl font-bold text-white">Private Bookmarks</h1>
          <p className="text-xs text-zinc-400">
            Signals you saved for future reference. Only visible to you.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      ) : bookmarks.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="w-7 h-7 text-amber-400" />}
          title="No bookmarked signals yet"
          description="Click the bookmark icon on any signal in the feed to save it to your private archive."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {bookmarks.map((post) => (
            <SignalCard
              key={post.id}
              post={post}
              onPostDeleted={(id) =>
                setBookmarks((prev) => prev.filter((p) => p.id !== id))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
