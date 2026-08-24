"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Users2, ArrowLeft, Plus, Shield, Sparkles } from "lucide-react";
import { Circle, Post } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getCircle, toggleCircleMembership } from "@/lib/api";
import { SignalCard } from "@/components/feed/SignalCard";
import { PostComposer } from "@/components/feed/PostComposer";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";

export default function CircleDetailPage() {
  const { slug } = useParams() as { slug: string };
  const { user } = useAuth();
  const { success } = useToast();

  const [circle, setCircle] = useState<Circle | null>(null);
  const [members, setMembers] = useState<unknown[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEmitOpen, setIsEmitOpen] = useState(false);

  const fetchCircleData = () => {
    getCircle(slug)
      .then((data) => {
        setCircle(data.circle);
        setMembers(data.members);
        setPosts(data.feed?.posts || []);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchCircleData();
  }, [slug, user]);

  const handleJoinToggle = async () => {
    if (!user || !circle) return;
    try {
      const res = await toggleCircleMembership(circle.slug);
      setCircle((prev) =>
        prev
          ? { ...prev, is_member: res.is_member, member_count: res.member_count }
          : null
      );
      success(res.is_member ? "Joined Circle!" : "Left Circle.");
      fetchCircleData();
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) {
    return <LoadingState text="Resolving Circle orbit trajectory..." />;
  }

  if (!circle) {
    return (
      <div className="py-24 text-center text-xs text-zinc-400 font-mono">
        Circle not found.{" "}
        <Link href="/circles" className="text-orba-400 underline">
          Return to directory
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-4 flex flex-col gap-6 pb-24 md:pb-12">
      <Link
        href="/circles"
        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Circles</span>
      </Link>

      {/* Circle Hero Card */}
      <div className="rounded-2xl bg-surface-card border border-surface-borderLight overflow-hidden shadow-lg">
        <div className="h-36 w-full relative bg-surface-elevated">
          {circle.banner_url && (
            <img
              src={circle.banner_url}
              alt={circle.name}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-surface-card via-surface-card/40 to-transparent" />
        </div>

        <div className="p-6 pt-0 -mt-10 relative z-10 flex flex-col gap-3">
          <div className="flex items-end justify-between">
            <img
              src={
                circle.avatar_url ||
                "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=256&auto=format&fit=crop&q=80"
              }
              alt={circle.name}
              className="w-20 h-20 rounded-2xl object-cover border-4 border-surface-card bg-surface-elevated shadow-xl"
            />
            <div className="flex items-center gap-2">
              <Button
                variant={circle.is_member ? "secondary" : "primary"}
                size="sm"
                onClick={handleJoinToggle}
                className={circle.is_member ? "text-emerald-400 border-emerald-500/30" : ""}
              >
                {circle.is_member ? "Member ✓" : "Join Circle"}
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEmitOpen(true)}
                leftIcon={<Plus className="w-4 h-4 text-orba-400" />}
              >
                Emit Signal Here
              </Button>
            </div>
          </div>

          <div>
            <h1 className="text-xl font-bold text-white">{circle.name}</h1>
            <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono mt-0.5">
              <span>{circle.member_count} orbital members</span>
              <span>•</span>
              <span>Led by @{circle.owner?.username || "founder"}</span>
            </div>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed max-w-2xl">
            {circle.description}
          </p>
        </div>
      </div>

      {/* Circle Signals Feed */}
      <div className="flex flex-col gap-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2 font-mono">
          <Sparkles className="w-4 h-4 text-orba-400" />
          Signals in this Circle ({posts.length})
        </h3>

        {posts.length === 0 ? (
          <EmptyState
            title="No signals in this Circle yet"
            description="Be the first to publish a technical signal into this community."
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsEmitOpen(true)}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Emit First Signal
              </Button>
            }
          />
        ) : (
          posts.map((post) => <SignalCard key={post.id} post={post} />)
        )}
      </div>

      {isEmitOpen && (
        <PostComposer
          isModal={true}
          defaultCircleId={circle.id}
          onClose={() => setIsEmitOpen(false)}
          onPostCreated={(newPost) => setPosts((prev) => [newPost, ...prev])}
        />
      )}
    </div>
  );
}
