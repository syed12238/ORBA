"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  position?: "bottom" | "right" | "left";
  children: React.ReactNode;
  className?: string;
}

export function Sheet({
  isOpen,
  onClose,
  title,
  position = "bottom",
  children,
  className,
}: SheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const positionStyles = {
    bottom:
      "bottom-0 left-0 right-0 max-h-[85vh] rounded-t-3xl border-t border-surface-borderLight animate-slide-up",
    right:
      "top-0 bottom-0 right-0 w-full max-w-sm border-l border-surface-borderLight animate-fade-in",
    left:
      "top-0 bottom-0 left-0 w-full max-w-sm border-r border-surface-borderLight animate-fade-in",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex bg-obsidian/80 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={sheetRef}
        className={twMerge(
          clsx(
            "fixed bg-surface-card shadow-2xl flex flex-col overflow-hidden",
            positionStyles[position],
            className
          )
        )}
      >
        {/* Drag handle pill for mobile sheet */}
        {position === "bottom" && (
          <div className="w-12 h-1 bg-surface-borderLight rounded-full mx-auto mt-3 mb-1" />
        )}

        {/* Sheet Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-borderLight">
          <div className="text-sm font-semibold text-white tracking-wide">{title}</div>
          <button
            onClick={onClose}
            aria-label="Close sheet"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-surface-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sheet Content */}
        <div className="p-5 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
