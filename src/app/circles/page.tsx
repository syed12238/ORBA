"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Users2, Plus, ArrowRight, ShieldCheck, Sparkles, Loader2 } from "lucide-react";
import { Circle } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getCircles, createCircle, toggleCircleMembership } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";

export default function CirclesPage() {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [circles, setCircles] = useState<Circle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // New Circle Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCirclesList = () => {
    getCircles()
      .then(setCircles)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchCirclesList();
  }, [user]);

  const handleJoinToggle = async (slug: string, circleId: string) => {
    if (!user) return;
    try {
      const res = await toggleCircleMembership(slug);
      setCircles((prev) =>
        prev.map((c) =>
          c.id === circleId
            ? { ...c, is_member: res.is_member, member_count: res.member_count }
            : c
        )
      );
      success(res.is_member ? "Joined Circle!" : "Left Circle.");
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateCircle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;

    setIsSubmitting(true);
    try {
      const newCircle = await createCircle({
        name: name.trim(),
        description: description.trim(),
      });

      success(`Circle "${newCircle.name}" created!`);
      setIsCreateOpen(false);
      setName("");
      setDescription("");
      fetchCirclesList();
    } catch (err: any) {
      error(err.message || "Failed to create Circle.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4 flex flex-col gap-6 pb-24 md:pb-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-borderLight pb-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users2 className="w-5 h-5 text-orba-400" />
            Community Circles
          </h1>
          <p className="text-xs text-zinc-400">
            Specialized orbital clusters dedicated to technical domains and craftsmanship.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          New Circle
        </Button>
      </div>

      {/* Circles Grid */}
      {isLoading ? (
        <LoadingState text="Loading community circles..." />
      ) : circles.length === 0 ? (
        <EmptyState
          icon={<Users2 className="w-7 h-7 text-zinc-500" />}
          title="No Circles established yet"
          description="Be the first to establish a community circle in your area of expertise."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Found a Circle
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {circles.map((circle) => (
            <div
              key={circle.id}
              className="rounded-2xl bg-surface-card border border-surface-borderLight overflow-hidden flex flex-col justify-between hover:border-surface-border transition-all shadow-sm group"
            >
              <div>
                {/* Banner */}
                <div className="h-24 w-full relative bg-surface-elevated">
                  {circle.banner_url && (
                    <img
                      src={circle.banner_url}
                      alt={circle.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-card to-transparent" />
                </div>

                <div className="p-4 pt-0 -mt-6 flex flex-col gap-2 relative z-10">
                  <div className="flex items-end justify-between">
                    <img
                      src={
                        circle.avatar_url ||
                        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=256&auto=format&fit=crop&q=80"
                      }
                      alt={circle.name}
                      className="w-12 h-12 rounded-xl object-cover border-2 border-surface-card bg-surface-elevated shadow-md"
                    />
                    <Button
                      size="xs"
                      variant={circle.is_member ? "secondary" : "primary"}
                      onClick={() => handleJoinToggle(circle.slug, circle.id)}
                      className={
                        circle.is_member
                          ? "text-emerald-400 border-emerald-500/30 hover:bg-rose-950/40 hover:text-rose-400 hover:border-rose-800/40"
                          : ""
                      }
                    >
                      {circle.is_member ? "Joined ✓" : "Join Circle"}
                    </Button>
                  </div>

                  <Link
                    href={`/circles/${circle.slug}`}
                    className="group-hover:text-orba-300 transition-colors"
                  >
                    <h3 className="font-bold text-sm text-white mt-1">
                      {circle.name}
                    </h3>
                    <span className="text-[11px] font-mono text-zinc-400">
                      {circle.member_count} orbital members
                    </span>
                  </Link>

                  <p className="text-xs text-zinc-300 leading-relaxed line-clamp-2 mt-1">
                    {circle.description}
                  </p>
                </div>
              </div>

              <div className="px-4 py-3 border-t border-surface-border/60 bg-surface-elevated/30 flex items-center justify-between text-xs">
                <span className="text-[10px] font-mono text-zinc-400">
                  Owner: @{circle.owner?.username || "founder"}
                </span>
                <Link
                  href={`/circles/${circle.slug}`}
                  className="text-orba-400 hover:text-orba-300 flex items-center gap-1 font-medium text-xs"
                >
                  <span>Enter Circle</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Circle Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Found a New Community Circle"
        description="Establish an orbital cluster dedicated to deep discourse."
      >
        <form onSubmit={handleCreateCircle} className="flex flex-col gap-4">
          <Input
            label="Circle Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Distributed Systems & eBPF"
            required
          />

          <Textarea
            label="Description & Scope"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain what topics orbit this community..."
            rows={3}
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              disabled={isSubmitting || !name.trim()}
            >
              Establish Circle
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
