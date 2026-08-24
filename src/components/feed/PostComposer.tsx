"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  X, Image as ImageIcon, Sparkles, Send, Globe, Users2, 
  Loader2, Lock, Eye, AlertCircle 
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { createPost, getCircles, uploadMedia } from "@/lib/api";
import { Circle, Post, Visibility } from "@/types";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";

export interface PostComposerProps {
  isModal?: boolean;
  onClose?: () => void;
  onPostCreated?: (newPost: Post) => void;
  defaultCircleId?: string;
  placeholder?: string;
  className?: string;
}

export function PostComposer({
  isModal = false,
  onClose,
  onPostCreated,
  defaultCircleId,
  placeholder = "What's orbiting your mind? (Supports #hashtags and @mentions)",
  className = "",
}: PostComposerProps) {
  const { user, profile } = useAuth();
  const { success, error } = useToast();

  const [content, setContent] = useState("");
  const [selectedCircle, setSelectedCircle] = useState(defaultCircleId || "");
  const [visibility, setVisibility] = useState<Visibility>("PUBLIC");
  const [circles, setCircles] = useState<Circle[]>([]);
  const [mediaList, setMediaList] = useState<{ url: string; previewUrl?: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    getCircles().then(setCircles).catch(console.error);
    if (isModal) {
      textareaRef.current?.focus();
    }
  }, [isModal]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const previewUrl = URL.createObjectURL(file);
    setIsUploading(true);

    try {
      const res = await uploadMedia(file);
      setMediaList((prev) => [...prev, { url: res.url, previewUrl }]);
    } catch (err: any) {
      error(err.message || "Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveMedia = (index: number) => {
    setMediaList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim() && mediaList.length === 0) {
      error("Please write some content or attach media.");
      return;
    }

    if (!user) {
      error("Authentication required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const newPost = await createPost({
        content: content.trim(),
        circleId: selectedCircle || undefined,
        visibility,
        media: mediaList.map((m) => ({ url: m.url })),
      });

      success("Signal emitted to your orbit!");
      setContent("");
      setMediaList([]);
      if (onPostCreated) onPostCreated(newPost);
      if (onClose) onClose();
    } catch (err: any) {
      error(err.message || "Failed to emit signal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const charLimit = 2000;
  const charsLeft = charLimit - content.length;
  const progressPercent = Math.min(100, (content.length / charLimit) * 100);

  const composerContent = (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <Avatar
          src={profile?.avatar_url}
          alt={profile?.display_name || user?.username || "User"}
          size="md"
        />

        <div className="flex-1 flex flex-col gap-2 min-w-0">
          {/* Header Controls (Destination & Visibility) */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-white truncate">
              {profile?.display_name || user?.username}
            </span>

            {/* Circle Destination Selector */}
            <select
              value={selectedCircle}
              onChange={(e) => setSelectedCircle(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-surface-elevated border border-surface-border text-[11px] font-mono text-zinc-300 focus:outline-none focus:border-orba-500 hover:border-surface-borderLight transition-colors"
            >
              <option value="">Public Orbit (Global)</option>
              {circles.map((c) => (
                <option key={c.id} value={c.id}>
                  Circle: {c.name}
                </option>
              ))}
            </select>

            {/* Visibility Selector */}
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as Visibility)}
              className="px-2 py-1 rounded-lg bg-surface-elevated border border-surface-border text-[11px] font-mono text-zinc-400 focus:outline-none focus:border-orba-500"
            >
              <option value="PUBLIC">🌐 Public</option>
              <option value="FOLLOWERS">👥 Orbiters Only</option>
              <option value="PRIVATE">🔒 Private</option>
            </select>
          </div>

          {/* Text Input Area */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={isModal ? 4 : 3}
            className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none resize-none leading-relaxed"
            maxLength={charLimit}
          />
        </div>
      </div>

      {/* Media Attachments Preview */}
      {mediaList.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mt-1 pl-12">
          {mediaList.map((m, idx) => (
            <div
              key={idx}
              className="relative rounded-xl overflow-hidden border border-surface-border aspect-video group bg-obsidian"
            >
              <img
                src={m.previewUrl || m.url}
                alt="Attachment preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemoveMedia(idx)}
                aria-label="Remove image"
                className="absolute top-2 right-2 p-1 rounded-full bg-black/80 text-white hover:bg-rose-600 transition-colors shadow-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {isUploading && (
        <div className="flex items-center gap-2 text-xs text-orba-400 animate-pulse font-mono pl-12">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Uploading and optimizing media attachment...</span>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-surface-border/60">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-hover border border-surface-border text-zinc-300 hover:text-white text-xs transition-colors"
          >
            <ImageIcon className="w-3.5 h-3.5 text-orba-400" />
            <span>Media</span>
          </button>

          <span className="text-[10px] font-mono text-zinc-500 hidden sm:inline">
            Ctrl+Enter to publish
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Character limit radial progress */}
          <div className="flex items-center gap-1.5 select-none">
            <span
              className={`text-[11px] font-mono ${
                charsLeft < 100 ? "text-rose-400 font-bold" : "text-zinc-500"
              }`}
            >
              {charsLeft}
            </span>
            <svg className="w-4 h-4 -rotate-90">
              <circle
                cx="8"
                cy="8"
                r="6"
                stroke="#1d2334"
                strokeWidth="2"
                fill="none"
              />
              <circle
                cx="8"
                cy="8"
                r="6"
                stroke={charsLeft < 100 ? "#f43f5e" : "#6366f1"}
                strokeWidth="2"
                strokeDasharray={37.7}
                strokeDashoffset={37.7 - (37.7 * progressPercent) / 100}
                fill="none"
              />
            </svg>
          </div>

          <Button
            type="submit"
            size="sm"
            isLoading={isSubmitting}
            disabled={isSubmitting || isUploading || (!content.trim() && mediaList.length === 0)}
            leftIcon={<Send className="w-3.5 h-3.5" />}
          >
            Emit Signal
          </Button>
        </div>
      </div>
    </form>
  );

  if (isModal) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian/85 backdrop-blur-md animate-fade-in"
        onClick={(e) => {
          if (e.target === e.currentTarget && onClose) onClose();
        }}
      >
        <div className="relative w-full max-w-xl rounded-2xl bg-surface-card border border-surface-borderLight shadow-2xl overflow-hidden flex flex-col animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-borderLight">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orba-400" />
              <span className="font-semibold text-white text-sm">
                Emit New Signal
              </span>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-surface-hover transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="p-5">{composerContent}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-4 rounded-2xl bg-surface-card border border-surface-borderLight shadow-sm ${className}`}
    >
      {composerContent}
    </div>
  );
}

// Backward compatibility alias
export const CreateSignalModal = ({
  onClose,
  onSignalCreated,
  defaultCircleId,
}: {
  onClose: () => void;
  onSignalCreated?: (newPost: any) => void;
  defaultCircleId?: string;
}) => (
  <PostComposer
    isModal={true}
    onClose={onClose}
    onPostCreated={onSignalCreated}
    defaultCircleId={defaultCircleId}
  />
);
