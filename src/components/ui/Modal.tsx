"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "md",
  className,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
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

  const maxWidthMap = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian/85 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={modalRef}
        className={twMerge(
          clsx(
            "relative w-full rounded-2xl bg-surface-card border border-surface-borderLight shadow-2xl overflow-hidden flex flex-col animate-scale-in",
            maxWidthMap[maxWidth],
            className
          )
        )}
      >
        {/* Modal Header */}
        {(title || description) && (
          <div className="flex items-start justify-between px-5 py-4 border-b border-surface-borderLight">
            <div className="flex flex-col gap-0.5 min-w-0 pr-4">
              {title && (
                <h3 className="text-sm font-semibold text-white tracking-wide truncate">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-xs text-zinc-400 leading-normal">
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-surface-hover transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Modal Content */}
        <div className="p-5 flex-1 overflow-y-auto max-h-[85vh]">{children}</div>
      </div>
    </div>
  );
}
