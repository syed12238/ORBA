"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./Button";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "Failed to load orbital data. Please check your network connection and retry.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={`py-12 px-6 rounded-2xl bg-rose-950/20 border border-rose-500/30 flex flex-col items-center justify-center text-center gap-3 ${
        className || ""
      }`}
    >
      <div className="p-3 rounded-2xl bg-rose-900/30 border border-rose-700/40 text-rose-400">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <div className="flex flex-col gap-1 max-w-sm">
        <h4 className="text-sm font-semibold text-rose-200">{title}</h4>
        <p className="text-xs text-rose-300/80 leading-relaxed">{message}</p>
      </div>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          className="mt-2 text-rose-200 border-rose-700/40 hover:bg-rose-900/40"
        >
          Try Again
        </Button>
      )}
    </div>
  );
}
