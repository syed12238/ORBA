"use client";

import React, { forwardRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, leftIcon, rightIcon, error, label, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label htmlFor={inputId} className="text-[11px] font-mono text-zinc-400 font-medium select-none">
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full group">
          {leftIcon && (
            <div className="absolute left-3.5 text-zinc-400 group-focus-within:text-orba-400 transition-colors pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={twMerge(
              clsx(
                "w-full bg-surface-card border text-xs text-white placeholder-zinc-500 rounded-xl transition-all duration-150",
                "focus:outline-none focus:border-orba-500 focus:ring-1 focus:ring-orba-500/40",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                leftIcon ? "pl-10" : "pl-3.5",
                rightIcon ? "pr-10" : "pr-3.5",
                "py-2.5",
                error
                  ? "border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/40"
                  : "border-surface-borderLight hover:border-surface-border",
                className
              )
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 text-zinc-400 flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <span className="text-[11px] text-rose-400 font-sans mt-0.5">{error}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";
