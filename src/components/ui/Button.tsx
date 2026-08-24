"use client";

import React, { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "subtle";
  size?: "xs" | "sm" | "md" | "lg" | "icon" | "icon-sm";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-150 select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orba-500 focus-visible:ring-offset-1 focus-visible:ring-offset-obsidian active:scale-[0.98]";

    const variantStyles = {
      primary:
        "bg-gradient-to-r from-orba-600 to-orba-500 hover:from-orba-500 hover:to-orba-400 text-white shadow-md shadow-orba-600/25 border border-orba-400/20",
      secondary:
        "bg-surface-elevated hover:bg-surface-hover text-zinc-100 border border-surface-borderLight hover:border-surface-border hover:text-white shadow-sm",
      outline:
        "bg-transparent hover:bg-surface-elevated/60 text-zinc-300 hover:text-white border border-surface-borderLight",
      ghost:
        "bg-transparent hover:bg-surface-hover/70 text-zinc-400 hover:text-zinc-100",
      danger:
        "bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 border border-rose-400/20",
      subtle:
        "bg-orba-500/10 hover:bg-orba-500/20 text-orba-300 border border-orba-500/20",
    };

    const sizeStyles = {
      xs: "text-[11px] px-2.5 py-1 rounded-lg gap-1.5 font-mono",
      sm: "text-xs px-3 py-1.5 rounded-xl gap-1.5 font-sans",
      md: "text-xs px-4 py-2 rounded-xl gap-2 font-sans font-semibold",
      lg: "text-sm px-5 py-2.5 rounded-xl gap-2 font-sans font-semibold",
      icon: "w-9 h-9 rounded-xl p-0",
      "icon-sm": "w-7 h-7 rounded-lg p-0",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={twMerge(clsx(baseStyles, variantStyles[variant], sizeStyles[size], className))}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-current" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
