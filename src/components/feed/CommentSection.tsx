"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Heart, Send, Loader2, X } from "lucide-react";
import { Comment } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getComments, addComment, likeComment } from "@/lib/api";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";

interface CommentSectionProps {
  postId: string;
  initialCommentsCount: number;
}

export function CommentSection({ postId }: CommentSectionProps) {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCommentsList = () => {
    getComments(postId)
      .then(setComments)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchCommentsList();
  }, [postId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setIsSubmitting(true);
    try {
      await addComment(postId, newComment.trim(), replyingTo?.id);
      setNewComment("");
      setReplyingTo(null);
      fetchCommentsList();
      success("Reply added to thread.");
    } catch (err: any) {
      error(err.message || "Failed to post comment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleCommentLike = async (commentId: string) => {
    if (!user) return;
    try {
      const res = await likeComment(commentId);
      setComments((prev) => {
        const update = (list: Comment[]): Comment[] => {
          return list.map((c) => {
            if (c.id === commentId) {
              return { ...c, has_liked: res.liked, like_count: res.like_count };
            }
            if (c.replies) {
              return { ...c, replies: update(c.replies) };
            }
            return c;
          });
        };
        return update(prev);
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="pt-4 mt-4 border-t border-surface-border/60 flex flex-col gap-4">
      {/* Add Comment Input Form */}
      {user ? (
        <form onSubmit={handleAddComment} className="flex flex-col gap-2">
          {replyingTo && (
            <div className="flex items-center justify-between text-xs text-orba-400 bg-orba-950/40 px-3 py-1.5 rounded-xl border border-orba-800/40">
              <span>Replying to @{replyingTo.username}</span>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={
                replyingTo
                  ? `Reply to @${replyingTo.username}...`
                  : "Contribute to this discussion orbit..."
              }
              className="flex-1 px-3.5 py-2 rounded-xl bg-surface-elevated border border-surface-border text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orba-500 transition-colors"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!newComment.trim() || isSubmitting}
              isLoading={isSubmitting}
              className="shrink-0"
            >
              Reply
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex items-center justify-between p-3 rounded-xl bg-surface-elevated/60 border border-surface-borderLight text-xs">
          <span className="text-zinc-400">Sign in with Google or continue as guest to reply</span>
          <Link href="/login" className="text-orba-400 hover:text-orba-300 font-semibold transition-colors">
            Sign In →
          </Link>
        </div>
      )}

      {/* Threaded Comments List */}
      {isLoading ? (
        <div className="py-4 text-center text-xs text-zinc-500 font-mono">
          Loading discussion orbit...
        </div>
      ) : comments.length === 0 ? (
        <div className="py-3 text-center text-xs text-zinc-500 italic">
          No replies yet. Be the first to start the conversation!
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="flex flex-col gap-2 p-3 rounded-xl bg-surface-elevated/40 border border-surface-border/40"
            >
              {/* Root Comment Header */}
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/profile/${comment.author?.username || "unknown"}`}
                  className="flex items-center gap-2"
                >
                  <Avatar
                    src={comment.author?.avatar_url}
                    alt={comment.author?.display_name || "User"}
                    size="sm"
                  />
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-white hover:text-orba-300 transition-colors">
                      {comment.author?.display_name}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      @{comment.author?.username}
                    </span>
                  </div>
                </Link>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleCommentLike(comment.id)}
                    className={`flex items-center gap-1 text-[11px] font-mono transition-colors ${
                      comment.has_liked
                        ? "text-rose-400 font-semibold"
                        : "text-zinc-400 hover:text-rose-400"
                    }`}
                  >
                    <Heart
                      className={`w-3 h-3 ${comment.has_liked ? "fill-rose-400" : ""}`}
                    />
                    <span>{comment.like_count > 0 ? comment.like_count : ""}</span>
                  </button>
                  <button
                    onClick={() =>
                      setReplyingTo({
                        id: comment.id,
                        username: comment.author?.username || "",
                      })
                    }
                    className="text-[10px] text-zinc-400 hover:text-orba-300 font-medium transition-colors"
                  >
                    Reply
                  </button>
                </div>
              </div>

              {/* Comment Content */}
              <p className="text-xs text-zinc-200 pl-9 leading-relaxed">
                {comment.content}
              </p>

              {/* Nested Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="pl-9 pt-2 flex flex-col gap-2 border-l-2 border-surface-border ml-3">
                  {comment.replies.map((reply) => (
                    <div
                      key={reply.id}
                      className="flex flex-col gap-1 p-2 rounded-lg bg-surface-card/60"
                    >
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/profile/${reply.author?.username || "unknown"}`}
                          className="flex items-center gap-1.5"
                        >
                          <Avatar
                            src={reply.author?.avatar_url}
                            alt={reply.author?.display_name || "User"}
                            size="xs"
                          />
                          <span className="text-[11px] font-semibold text-white">
                            {reply.author?.display_name}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400">
                            @{reply.author?.username}
                          </span>
                        </Link>
                        <button
                          onClick={() => handleToggleCommentLike(reply.id)}
                          className={`flex items-center gap-1 text-[10px] font-mono ${
                            reply.has_liked
                              ? "text-rose-400"
                              : "text-zinc-400 hover:text-rose-400"
                          }`}
                        >
                          <Heart
                            className={`w-2.5 h-2.5 ${
                              reply.has_liked ? "fill-rose-400" : ""
                            }`}
                          />
                          <span>{reply.like_count > 0 ? reply.like_count : ""}</span>
                        </button>
                      </div>
                      <p className="text-xs text-zinc-300 pl-7">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
