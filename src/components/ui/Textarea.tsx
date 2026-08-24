"use client";

import React, { forwardRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  label?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, label, id, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label htmlFor={textareaId} className="text-[11px] font-mono text-zinc-400 font-medium select-none">
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          className={twMerge(
            clsx(
              "w-full bg-surface-card border text-xs text-white placeholder-zinc-500 rounded-xl p-3 transition-all duration-150 resize-none leading-relaxed",
              "focus:outline-none focus:border-orba-500 focus:ring-1 focus:ring-orba-500/40",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              error
                ? "border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/40"
                : "border-surface-borderLight hover:border-surface-border",
              className
            )
          )}
          {...props}
        />
        {error && <span className="text-[11px] text-rose-400 font-sans mt-0.5">{error}</span>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
