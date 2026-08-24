"use client";

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: "pill" | "underline";
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, variant = "pill", className }: TabsProps) {
  return (
    <div
      className={twMerge(
        clsx(
          "flex items-center gap-1 overflow-x-auto select-none",
          variant === "underline" ? "border-b border-surface-borderLight pb-1" : "p-1",
          className
        )
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        if (variant === "underline") {
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={clsx(
                "relative flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-colors duration-150 shrink-0",
                isActive ? "text-white" : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              {Icon && <Icon className={clsx("w-3.5 h-3.5", isActive ? "text-orba-400" : "text-zinc-500")} />}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-surface-elevated text-zinc-400">
                  {tab.count}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-orba-500 rounded-full" />
              )}
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={clsx(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 shrink-0",
              isActive
                ? "bg-surface-elevated text-white border border-surface-borderLight shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-surface-hover/50"
            )}
          >
            {Icon && <Icon className={clsx("w-3.5 h-3.5", isActive ? "text-orba-400" : "text-zinc-500")} />}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="text-[10px] font-mono text-zinc-400">
                ({tab.count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
