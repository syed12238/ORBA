"use client";

import React from "react";
import { CheckCircle2, ShieldAlert, Sparkles, Shield } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { UserRole } from "@/types";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "verified" | "admin" | "moderator" | "pulse" | "outline" | "success" | "warning" | "danger";
  size?: "sm" | "md";
}

export function Badge({ className, variant = "default", size = "sm", children, ...props }: BadgeProps) {
  const baseStyles = "inline-flex items-center font-mono font-medium rounded-md select-none transition-colors";

  const sizeStyles = {
    sm: "text-[10px] px-1.5 py-0.5 gap-1",
    md: "text-xs px-2 py-0.5 gap-1.5",
  };

  const variantStyles = {
    default: "bg-surface-elevated text-zinc-300 border border-surface-borderLight",
    verified: "bg-orba-500/15 text-orba-300 border border-orba-500/30 font-semibold",
    admin: "bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold",
    moderator: "bg-accent-amber/15 text-amber-300 border border-accent-amber/30",
    pulse: "bg-orba-500 text-white font-bold animate-pulse shadow-sm shadow-orba-500/50 rounded-full",
    outline: "bg-transparent text-zinc-400 border border-surface-borderLight",
    success: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
    warning: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
    danger: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
  };

  return (
    <span className={twMerge(clsx(baseStyles, sizeStyles[size], variantStyles[variant], className))} {...props}>
      {variant === "verified" && <CheckCircle2 className="w-3 h-3 text-orba-400 shrink-0" />}
      {variant === "admin" && <ShieldAlert className="w-3 h-3 text-rose-400 shrink-0" />}
      {variant === "moderator" && <Shield className="w-3 h-3 text-amber-400 shrink-0" />}
      {children}
    </span>
  );
}

export function RoleBadge({ role }: { role?: UserRole }) {
  if (role === "ADMIN") return <Badge variant="admin">ADMIN</Badge>;
  if (role === "MODERATOR") return <Badge variant="moderator">MOD</Badge>;
  return null;
}
