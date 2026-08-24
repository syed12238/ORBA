"use client";

import React from "react";
import { Loader2 } from "lucide-react";

export function LoadingState({
  text = "Synchronizing orbital stream...",
  className = "",
}: {
  text?: string;
  className?: string;
}) {
  return (
    <div
      className={`py-16 flex flex-col items-center justify-center gap-3 text-xs text-zinc-400 font-mono select-none ${className}`}
    >
      <div className="relative flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-orba-400" />
        <div className="absolute w-2 h-2 rounded-full bg-accent-cyan" />
      </div>
      <span>{text}</span>
    </div>
  );
}
