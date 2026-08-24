"use client";

import React, { useState } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { UserPresence } from "@/types";

export interface AvatarProps {
  src?: string;
  alt?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  presence?: UserPresence;
  className?: string;
  fallbackText?: string;
}

export function Avatar({
  src,
  alt = "User",
  size = "md",
  presence,
  className,
  fallbackText,
}: AvatarProps) {
  const [hasError, setHasError] = useState(false);

  const sizeMap = {
    xs: "w-5 h-5 text-[9px]",
    sm: "w-7 h-7 text-[11px]",
    md: "w-9 h-9 text-xs",
    lg: "w-11 h-11 text-sm",
    xl: "w-14 h-14 text-base",
    "2xl": "w-20 h-20 text-xl",
  };

  const presenceDotSize = {
    xs: "w-1.5 h-1.5",
    sm: "w-2 h-2",
    md: "w-2.5 h-2.5",
    lg: "w-3 h-3",
    xl: "w-3.5 h-3.5",
    "2xl": "w-4 h-4",
  };

  const presenceColor = {
    ONLINE: "bg-emerald-400",
    AWAY: "bg-amber-400",
    OFFLINE: "bg-zinc-600",
  };

  const fallbackInitial = fallbackText
    ? fallbackText.charAt(0).toUpperCase()
    : alt.charAt(0).toUpperCase();

  const defaultAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=256&auto=format&fit=crop&q=80";

  return (
    <div className={twMerge(clsx("relative inline-flex shrink-0 select-none", sizeMap[size], className))}>
      {src && !hasError ? (
        <img
          src={src || defaultAvatar}
          alt={alt}
          onError={() => setHasError(true)}
          className="w-full h-full rounded-full object-cover border border-surface-borderLight/80 bg-surface-elevated"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full rounded-full bg-gradient-to-br from-orba-700 to-surface-card border border-surface-borderLight flex items-center justify-center font-bold text-white font-mono shadow-inner">
          {fallbackInitial || "U"}
        </div>
      )}

      {presence && (
        <span
          className={twMerge(
            clsx(
              "absolute bottom-0 right-0 rounded-full border-2 border-obsidian",
              presenceDotSize[size],
              presenceColor[presence]
            )
          )}
        />
      )}
    </div>
  );
}
