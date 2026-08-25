"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Heart, MessageSquare, Repeat2, Bookmark, Share2, 
  MoreHorizontal, ShieldAlert, Sparkles, CheckCircle2,
  Trash2, Copy
} from "lucide-react";
import { Post } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { likePost, bookmarkPost, repostPost, reportPost } from "@/lib/api";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { CommentSection } from "./CommentSection";

interface SignalCardProps {
  post: Post;
  onPostDeleted?: (postId: string) => void;
  className?: string;
}

export function SignalCard({ post: initialPost, onPostDeleted, className = "" }: SignalCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { success, error, info } = useToast();

  const [post, setPost] = useState<Post>(initialPost);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Sync state if initialPost updates
  React.useEffect(() => {
    setPost(initialPost);
  }, [initialPost]);

  const handleLike = async () => {
    if (!user) {
      error("Please sign in or continue as guest to like signals.");
      router.push("/login");
      return;
    }

    const currentLiked = !!post.has_liked;
    const currentCount = post.like_count;

    // Optimistic Update
    setPost((prev) => ({
      ...prev,
      has_liked: !currentLiked,
      like_count: currentLiked ? Math.max(0, currentCount - 1) : currentCount + 1,
    }));

    try {
      const res = await likePost(post.id);
      setPost((prev) => ({
        ...prev,
        has_liked: res.liked,
        like_count: res.like_count,
      }));
    } catch {
      // Rollback
      setPost((prev) => ({ ...prev, has_liked: currentLiked, like_count: currentCount }));
    }
  };

  const handleBookmark = async () => {
    if (!user) {
      error("Please sign in to save bookmarks to your private orbit.");
      router.push("/login");
      return;
    }
    const currentBookmarked = !!post.has_bookmarked;
    const currentCount = post.bookmark_count;

    setPost((prev) => ({
      ...prev,
      has_bookmarked: !currentBookmarked,
      bookmark_count: currentBookmarked ? Math.max(0, currentCount - 1) : currentCount + 1,
    }));

    try {
      const res = await bookmarkPost(post.id);
      setPost((prev) => ({
        ...prev,
        has_bookmarked: res.bookmarked,
        bookmark_count: res.bookmark_count,
      }));
      if (res.bookmarked) {
        success("Signal added to your private bookmarks.");
      }
    } catch {
      setPost((prev) => ({
        ...prev,
        has_bookmarked: currentBookmarked,
        bookmark_count: currentCount,
      }));
    }
  };

  const handleRepost = async () => {
    if (!user) {
      error("Please sign in to repost signals.");
      router.push("/login");
      return;
    }
    const currentReposted = !!post.has_reposted;
    const currentCount = post.repost_count;

    setPost((prev) => ({
      ...prev,
      has_reposted: !currentReposted,
      repost_count: currentReposted ? Math.max(0, currentCount - 1) : currentCount + 1,
    }));

    try {
      const res = await repostPost(post.id);
      setPost((prev) => ({
        ...prev,
        has_reposted: res.reposted,
        repost_count: res.repost_count,
      }));
      if (res.reposted) {
        success("Signal reposted to your followers' orbit.");
      }
    } catch {
      setPost((prev) => ({
        ...prev,
        has_reposted: currentReposted,
        repost_count: currentCount,
      }));
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(`${window.location.origin}/#${post.id}`);
      info("Signal orbit link copied to clipboard!");
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportReason.trim() || !user) return;

    setIsSubmittingReport(true);
    try {
      await reportPost(post.id, reportReason.trim());
      success("Report submitted to the Trust & Safety moderation queue.");
      setIsReporting(false);
      setReportReason("");
    } catch (err: any) {
      error(err.message || "Failed to submit report.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const formatContent = (text?: string) => {
    if (!text) return null;
    const parts = text.split(/(\s+)/);
    return parts.map((part, i) => {
      if (part.startsWith("#")) {
        const tag = part.substring(1).replace(/[^a-zA-Z0-9_]/g, "");
        return (
          <Link
            key={i}
            href={`/explore?q=%23${tag}`}
            className="text-accent-cyan hover:underline font-medium"
          >
            {part}
          </Link>
        );
      }
      if (part.startsWith("@")) {
        const handle = part.substring(1).replace(/[^a-zA-Z0-9_]/g, "");
        return (
          <Link
            key={i}
            href={`/profile/${handle}`}
            className="text-orba-400 hover:underline font-medium"
          >
            {part}
          </Link>
        );
      }
      return part;
    });
  };

  const author = post?.author;
  const username = author?.username || "unknown";
  const displayName = author?.display_name || username;

  let formattedTime = "just now";
  try {
    if (post?.created_at) {
      formattedTime = new Date(post.created_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  } catch {}

  return (
    <article
      className={`p-5 rounded-2xl bg-surface-card border border-surface-borderLight hover:border-surface-border transition-all duration-150 shadow-sm relative group ${className}`}
    >
      {/* Circle Indicator if attached to Circle */}
      {post.circle && (
        <div className="flex items-center gap-1.5 mb-3 text-[11px] font-mono text-zinc-400">
          <Sparkles className="w-3 h-3 text-orba-400" />
          <span>Orbiting in</span>
          <Link
            href={`/circles/${post.circle.slug || post.circle.id}`}
            className="text-orba-300 hover:underline font-semibold"
          >
            {post.circle.name}
          </Link>
        </div>
      )}

      {/* Author Header */}
      <div className="flex items-start justify-between gap-3">
        <Link
          href={`/profile/${username}`}
          className="flex items-center gap-3 min-w-0 group/author"
        >
          <Avatar
            src={author?.avatar_url}
            alt={displayName}
            size="md"
            className="group-hover/author:border-orba-500 transition-colors"
          />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-semibold text-white group-hover/author:text-orba-300 transition-colors truncate">
                {displayName}
              </span>
              {author?.is_verified && <CheckCircle2 className="w-3.5 h-3.5 text-orba-400 shrink-0" />}
              {author?.role === "ADMIN" && <Badge variant="admin">ADMIN</Badge>}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
              <span>@{username}</span>
              <span>•</span>
              <span>{formattedTime}</span>
            </div>
          </div>
        </Link>

        {/* Options Dropdown Menu */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Post options"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-surface-hover transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-surface-card border border-surface-borderLight shadow-2xl p-1 z-40 animate-scale-in">
              <button
                onClick={() => {
                  handleShare();
                  setIsMenuOpen(false);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-surface-hover transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Link</span>
              </button>
              <button
                onClick={() => {
                  setIsReporting(true);
                  setIsMenuOpen(false);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-rose-400 hover:bg-rose-950/40 transition-colors"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Report Signal</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Signal Text Content */}
      {post.content && (
        <div className="mt-3 text-xs sm:text-sm text-zinc-100 leading-relaxed break-words whitespace-pre-line font-sans selection:bg-orba-500/30">
          {formatContent(post.content)}
        </div>
      )}

      {/* Media Attachments Gallery */}
      {post.media && Array.isArray(post.media) && post.media.length > 0 && (
        <div className="mt-3 rounded-xl overflow-hidden border border-surface-border bg-obsidian">
          {post.media.map((m, idx) => (
            <div key={m.id || m.url || idx} className="relative aspect-video max-h-96 w-full">
              <img
                src={m.url}
                alt="Signal media attachment"
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Tactical Interaction Bar */}
      <div className="mt-4 pt-3 border-t border-surface-border/60 flex items-center justify-between text-zinc-400 text-xs select-none">
        {/* Comment */}
        <button
          onClick={() => setIsCommentsOpen(!isCommentsOpen)}
          className={`flex items-center gap-1.5 py-1 px-2 rounded-lg transition-colors group ${
            isCommentsOpen
              ? "text-orba-400 bg-orba-500/10"
              : "hover:text-orba-400 hover:bg-surface-hover"
          }`}
          aria-label="Comments"
        >
          <MessageSquare className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span className="font-mono">{post.comment_count > 0 ? post.comment_count : ""}</span>
        </button>

        {/* Repost */}
        <button
          onClick={handleRepost}
          className={`flex items-center gap-1.5 py-1 px-2 rounded-lg transition-colors group ${
            post.has_reposted
              ? "text-emerald-400 font-semibold"
              : "hover:text-emerald-400 hover:bg-surface-hover"
          }`}
          aria-label="Repost"
        >
          <Repeat2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span className="font-mono">{post.repost_count > 0 ? post.repost_count : ""}</span>
        </button>

        {/* Like */}
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 py-1 px-2 rounded-lg transition-colors group ${
            post.has_liked
              ? "text-rose-400 font-semibold"
              : "hover:text-rose-400 hover:bg-surface-hover"
          }`}
          aria-label="Like"
        >
          <Heart
            className={`w-4 h-4 group-hover:scale-125 transition-transform ${
              post.has_liked ? "fill-rose-400" : ""
            }`}
          />
          <span className="font-mono">{post.like_count > 0 ? post.like_count : ""}</span>
        </button>

        {/* Bookmark */}
        <button
          onClick={handleBookmark}
          className={`flex items-center gap-1.5 py-1 px-2 rounded-lg transition-colors group ${
            post.has_bookmarked
              ? "text-accent-amber font-semibold text-amber-400"
              : "hover:text-amber-400 hover:bg-surface-hover"
          }`}
          aria-label="Bookmark"
        >
          <Bookmark
            className={`w-4 h-4 group-hover:scale-110 transition-transform ${
              post.has_bookmarked ? "fill-amber-400" : ""
            }`}
          />
          <span className="font-mono">
            {post.bookmark_count > 0 ? post.bookmark_count : ""}
          </span>
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          className="p-1.5 rounded-lg hover:text-white hover:bg-surface-hover transition-colors"
          aria-label="Share signal"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      {/* Embedded Discussion Orbit */}
      {isCommentsOpen && (
        <CommentSection postId={post.id} initialCommentsCount={post.comment_count} />
      )}

      {/* Report Modal */}
      <Modal
        isOpen={isReporting}
        onClose={() => setIsReporting(false)}
        title="Report Signal to Trust & Safety"
        description="Describe why this signal violates technical platform standards or community safety."
      >
        <form onSubmit={handleReportSubmit} className="flex flex-col gap-4">
          <textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="Provide context on the violation..."
            rows={3}
            className="w-full p-3 rounded-xl bg-surface-elevated border border-surface-border text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
            required
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsReporting(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              isLoading={isSubmittingReport}
            >
              Submit Report
            </Button>
          </div>
        </form>
      </Modal>
    </article>
  );
}

// Re-export as PostCard alias
export const PostCard = SignalCard;
