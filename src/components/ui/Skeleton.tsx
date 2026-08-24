"use client";

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular" | "card";
}

export function Skeleton({ className, variant = "rectangular", ...props }: SkeletonProps) {
  const baseStyles = "animate-pulse bg-surface-elevated/70 border border-surface-border/40";

  const variantStyles = {
    text: "h-3 rounded-md w-full",
    circular: "rounded-full shrink-0",
    rectangular: "rounded-xl",
    card: "p-5 rounded-2xl flex flex-col gap-3",
  };

  return (
    <div
      className={twMerge(clsx(baseStyles, variantStyles[variant], className))}
      {...props}
    />
  );
}

export function PostCardSkeleton() {
  return (
    <div className="p-5 rounded-2xl bg-surface-card border border-surface-borderLight flex flex-col gap-3 animate-pulse">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" className="w-10 h-10" />
        <div className="flex flex-col gap-1.5 flex-1">
          <Skeleton variant="text" className="w-32 h-3.5" />
          <Skeleton variant="text" className="w-20 h-2.5" />
        </div>
      </div>
      <Skeleton variant="text" className="w-full h-4 mt-1" />
      <Skeleton variant="text" className="w-4/5 h-4" />
      <div className="pt-3 border-t border-surface-border/50 flex items-center justify-between">
        <Skeleton variant="text" className="w-12 h-3" />
        <Skeleton variant="text" className="w-12 h-3" />
        <Skeleton variant="text" className="w-12 h-3" />
        <Skeleton variant="text" className="w-12 h-3" />
      </div>
    </div>
  );
}
