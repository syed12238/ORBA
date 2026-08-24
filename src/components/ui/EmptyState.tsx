"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={twMerge(
        clsx(
          "py-14 px-6 rounded-2xl bg-surface-card/60 border border-surface-border flex flex-col items-center justify-center text-center gap-3 select-none",
          className
        )
      )}
    >
      <div className="p-3 rounded-2xl bg-surface-elevated border border-surface-borderLight text-zinc-400">
        {icon || <Sparkles className="w-6 h-6 text-orba-400" />}
      </div>
      <div className="flex flex-col gap-1 max-w-sm">
        <h4 className="text-sm font-semibold text-white tracking-wide">{title}</h4>
        {description && (
          <p className="text-xs text-zinc-400 leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
