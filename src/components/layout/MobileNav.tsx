"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRealtime } from "@/context/RealtimeContext";
import { PRIMARY_NAV_ITEMS } from "@/config/navigation";
import { PostComposer } from "../feed/PostComposer";

export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { unreadCount } = useRealtime();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Take the primary 4 items for mobile bottom bar: Home, Explore, Messages, Pulse
  const items = PRIMARY_NAV_ITEMS.filter((i) =>
    ["Home", "Explore", "Messages", "Pulse"].includes(i.label)
  );

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-obsidian/95 backdrop-blur-2xl border-t border-surface-borderLight flex items-center justify-around px-2 z-40 select-none safe-area-bottom">
        {/* First 2 items (Home, Explore) */}
        {items.slice(0, 2).map((item) => {
          const isActive =
            pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center p-2 transition-colors ${
                isActive ? "text-orba-400 font-semibold" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium mt-0.5">{item.label}</span>
            </Link>
          );
        })}

        {/* Floating Center Action Button */}
        <button
          onClick={() => setIsCreateOpen(true)}
          aria-label="Emit new signal"
          className="relative -top-4 w-12 h-12 rounded-full bg-gradient-to-r from-orba-600 to-orba-500 flex items-center justify-center text-white shadow-xl shadow-orba-500/40 border-2 border-obsidian active:scale-95 transition-transform"
        >
          <Plus className="w-6 h-6" />
        </button>

        {/* Remaining 2 items (Messages, Pulse) */}
        {items.slice(2).map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          const badge =
            item.badgeKey === "unreadCount" && unreadCount > 0
              ? unreadCount
              : undefined;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`relative flex flex-col items-center justify-center p-2 transition-colors ${
                isActive ? "text-orba-400 font-semibold" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {badge !== undefined && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-orba-500 text-[9px] font-mono font-bold flex items-center justify-center text-white ring-2 ring-obsidian">
                    {badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {isCreateOpen && (
        <PostComposer isModal={true} onClose={() => setIsCreateOpen(false)} />
      )}
    </>
  );
}
