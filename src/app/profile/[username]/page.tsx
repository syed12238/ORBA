"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  MapPin, Link2, Calendar, CheckCircle2, MessageSquare, 
  Share2, Edit3, Loader2, Sparkles, X, Users2 
} from "lucide-react";
import { UserProfileFull, Post, Profile } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { 
  getProfile, getUserSignals, updateProfile, toggleFollow, 
  getFollowList, startConversation 
} from "@/lib/api";
import { SignalCard } from "@/components/feed/SignalCard";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PostCardSkeleton } from "@/components/ui/Skeleton";

export default function ProfilePage() {
  const { username } = useParams() as { username: string };
  const router = useRouter();
  const { user, updateLocalProfile } = useAuth();
  const { success, error, info } = useToast();

  const [profile, setProfile] = useState<UserProfileFull | null>(null);
  const [signals, setSignals] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<string>("posts");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSignals, setIsLoadingSignals] = useState(false);
  const [isFollowListOpen, setIsFollowListOpen] = useState<"followers" | "following" | null>(null);
  const [followList, setFollowList] = useState<(Profile & { username: string })[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Edit Profile Form State
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isMe = user?.username.toLowerCase() === username.toLowerCase();

  const fetchProfileData = () => {
    getProfile(username)
      .then((data) => {
        setProfile(data);
        setEditDisplayName(data.display_name);
        setEditBio(data.bio || "");
        setEditWebsite(data.website || "");
        setEditLocation(data.location || "");
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  const fetchSignalsList = () => {
    setIsLoadingSignals(true);
    getUserSignals(username, activeTab as any)
      .then(setSignals)
      .catch(console.error)
      .finally(() => setIsLoadingSignals(false));
  };

  useEffect(() => {
    fetchProfileData();
  }, [username, user]);

  useEffect(() => {
    fetchSignalsList();
  }, [username, activeTab]);

  const handleFollowToggle = async () => {
    if (!user || !profile) return;
    try {
      const res = await toggleFollow(profile.username);
      setProfile((prev) => {
        if (!prev) return null;
        const wasFollowing = prev.is_following;
        const isNowFollowing = res.is_following;
        return {
          ...prev,
          is_following: isNowFollowing,
          followers_count: isNowFollowing
            ? prev.followers_count + 1
            : Math.max(0, prev.followers_count - 1),
        };
      });
      success(
        res.is_following
          ? `Now orbiting @${profile.username}`
          : `Left orbit of @${profile.username}`
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenFollowList = async (type: "followers" | "following") => {
    setIsFollowListOpen(type);
    try {
      const list = await getFollowList(username, type);
      setFollowList(list);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      const updated = await updateProfile(username, {
        display_name: editDisplayName,
        bio: editBio,
        website: editWebsite,
        location: editLocation,
      });

      setProfile((prev) => (prev ? { ...prev, ...updated } : null));
      updateLocalProfile(updated);
      success("Profile orbit updated!");
      setIsEditModalOpen(false);
    } catch (err: any) {
      error(err.message || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDirectMessage = async () => {
    if (!user || !profile) return;
    try {
      await startConversation(profile.user_id);
      router.push("/messages");
    } catch (e) {
      console.error(e);
    }
  };

  const profileTabs = [
    { id: "posts", label: "Signals" },
    { id: "replies", label: "Replies" },
    { id: "media", label: "Media" },
    { id: "liked", label: "Liked" },
  ];

  if (isLoading) {
    return <LoadingState text="Resolving user orbital profile..." />;
  }

  if (!profile) {
    return (
      <div className="py-24 text-center text-xs text-zinc-400 font-mono">
        User @{username} not found.{" "}
        <Link href="/" className="text-orba-400 underline">
          Return home
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4 flex flex-col gap-5 pb-24 md:pb-12">
      {/* Profile Card Header */}
      <div className="rounded-2xl bg-surface-card border border-surface-borderLight overflow-hidden shadow-xl">
        {/* Banner */}
        <div className="h-36 sm:h-44 w-full relative bg-surface-elevated">
          {profile.banner_url && (
            <img
              src={profile.banner_url}
              alt={profile.display_name}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-surface-card via-surface-card/30 to-transparent" />
        </div>

        {/* Profile Details */}
        <div className="p-6 pt-0 -mt-12 relative z-10 flex flex-col gap-4">
          <div className="flex items-end justify-between">
            <div className="relative">
              <Avatar
                src={profile.avatar_url}
                alt={profile.display_name}
                size="2xl"
                className="border-4 border-surface-card shadow-2xl"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {isMe ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEditModalOpen(true)}
                  leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                >
                  Edit Profile
                </Button>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={handleDirectMessage}
                    aria-label="Direct Message"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Button>

                  <Button
                    variant={profile.is_following ? "secondary" : "primary"}
                    size="sm"
                    onClick={handleFollowToggle}
                    className={
                      profile.is_following
                        ? "hover:bg-rose-950/40 hover:text-rose-400 hover:border-rose-800/40"
                        : ""
                    }
                  >
                    {profile.is_following ? "Orbiting ✓" : "Orbit"}
                  </Button>
                </>
              )}

              <Button
                variant="secondary"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  info("Profile link copied to clipboard!");
                }}
                aria-label="Share profile link"
              >
                <Share2 className="w-4 h-4 text-zinc-400" />
              </Button>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-bold text-white tracking-tight">
                {profile.display_name}
              </h1>
              {profile.is_verified && <CheckCircle2 className="w-4 h-4 text-orba-400 shrink-0" />}
              {profile.role === "ADMIN" && <Badge variant="admin">ADMIN</Badge>}
            </div>
            <span className="text-xs font-mono text-zinc-400">@{profile.username}</span>
          </div>

          {profile.bio && (
            <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed max-w-xl">
              {profile.bio}
            </p>
          )}

          {/* Metadata info */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
            {profile.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                <span>{profile.location}</span>
              </div>
            )}
            {profile.website && (
              <div className="flex items-center gap-1">
                <Link2 className="w-3.5 h-3.5 text-zinc-500" />
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-orba-400 hover:underline truncate max-w-xs"
                >
                  {profile.website.replace(/^https?:\/\//, "")}
                </a>
              </div>
            )}
            <div className="flex items-center gap-1 font-mono text-[11px]">
              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
              <span>
                Joined{" "}
                {new Date(profile.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>

          {/* Social Orbit Counts */}
          <div className="flex items-center gap-5 pt-3 border-t border-surface-border/60 text-xs select-none">
            <button
              onClick={() => handleOpenFollowList("following")}
              className="flex items-center gap-1 hover:underline"
            >
              <span className="font-bold text-white font-mono">
                {profile.following_count}
              </span>
              <span className="text-zinc-400">Following</span>
            </button>
            <button
              onClick={() => handleOpenFollowList("followers")}
              className="flex items-center gap-1 hover:underline"
            >
              <span className="font-bold text-white font-mono">
                {profile.followers_count}
              </span>
              <span className="text-zinc-400">Orbiters</span>
            </button>
            <div className="flex items-center gap-1">
              <span className="font-bold text-white font-mono">
                {profile.posts_count}
              </span>
              <span className="text-zinc-400">Signals</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={profileTabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="underline"
      />

      {/* Signals Feed for this User */}
      <div className="flex flex-col gap-4">
        {isLoadingSignals ? (
          <div className="flex flex-col gap-4">
            <PostCardSkeleton />
            <PostCardSkeleton />
          </div>
        ) : signals.length === 0 ? (
          <EmptyState
            title="No signals in this tab category"
            description="When this user publishes signals or replies, they will be archived here."
          />
        ) : (
          signals.map((post) => (
            <SignalCard
              key={post.id}
              post={post}
              onPostDeleted={(id) =>
                setSignals((prev) => prev.filter((p) => p.id !== id))
              }
            />
          ))
        )}
      </div>

      {/* Followers / Following Modal */}
      <Modal
        isOpen={isFollowListOpen !== null}
        onClose={() => setIsFollowListOpen(null)}
        title={
          isFollowListOpen === "followers"
            ? "Orbiters (Followers)"
            : "Orbiting (Following)"
        }
      >
        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
          {followList.length === 0 ? (
            <div className="py-6 text-center text-xs text-zinc-500">
              No users found.
            </div>
          ) : (
            followList.map((u) => (
              <Link
                key={u.user_id}
                href={`/profile/${u.username}`}
                onClick={() => setIsFollowListOpen(null)}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-hover transition-colors"
              >
                <Avatar src={u.avatar_url} alt={u.display_name} size="md" />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-white truncate">
                    {u.display_name}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    @{u.username}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Profile Orbit"
        description="Update your public persona, bio, and portfolio link."
      >
        <form onSubmit={handleSaveProfile} className="flex flex-col gap-3">
          <Input
            label="Display Name"
            value={editDisplayName}
            onChange={(e) => setEditDisplayName(e.target.value)}
            required
          />

          <Textarea
            label="Bio"
            value={editBio}
            onChange={(e) => setEditBio(e.target.value)}
            rows={3}
          />

          <Input
            label="Website"
            value={editWebsite}
            onChange={(e) => setEditWebsite(e.target.value)}
            placeholder="https://..."
          />

          <Input
            label="Location"
            value={editLocation}
            onChange={(e) => setEditLocation(e.target.value)}
            placeholder="e.g. San Francisco, CA"
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSaving}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
