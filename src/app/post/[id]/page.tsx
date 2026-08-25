"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Post } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { request } from "@/lib/api";
import { SignalCard } from "@/components/feed/SignalCard";
import { CommentSection } from "@/components/feed/CommentSection";
import { LoadingState } from "@/components/ui/LoadingState";

export default function PostPage() {
  const { id } = useParams() as { id: string };
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;

    const queryParam = user ? `?userId=${user.id}` : "";
    request<Post>(`/api/v1/posts/${id}${queryParam}`)
      .then((data) => {
        setPost(data);
      })
      .catch((err) => {
        console.error("Failed to load post:", err);
        setNotFound(true);
      })
      .finally(() => setIsLoading(false));
  }, [id, user]);

  if (isLoading) {
    return <LoadingState text="Loading signal..." />;
  }

  if (notFound || !post) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-zinc-500" />
        </div>
        <h2 className="text-lg font-bold text-white">Signal Not Found</h2>
        <p className="text-xs text-zinc-400 max-w-sm">
          This signal may have been deleted or doesn&apos;t exist in the ORBA network.
        </p>
        <Link
          href="/"
          className="mt-2 px-4 py-2 rounded-xl bg-orba-600 hover:bg-orba-500 text-white text-xs font-semibold transition-colors"
        >
          Return to Feed
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4 flex flex-col gap-4 pb-24 md:pb-12">
      {/* Back Navigation */}
      <Link
        href="/"
        className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors w-fit group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        <span>Back to Feed</span>
      </Link>

      {/* Signal Card */}
      <SignalCard
        post={post}
        onPostDeleted={() => {
          if (typeof window !== "undefined") {
            window.location.href = "/";
          }
        }}
      />

      {/* Full Comments Section (always expanded) */}
      <div className="rounded-2xl bg-surface-card border border-surface-borderLight p-4">
        <CommentSection
          postId={post.id}
          initialCommentsCount={post.comment_count}
        />
      </div>
    </div>
  );
}
