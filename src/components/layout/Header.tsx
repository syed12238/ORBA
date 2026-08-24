"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, LogIn } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "../ui/Avatar";

export function Header() {
  const pathname = usePathname();
  const { user, profile } = useAuth();

  const getPageTitle = () => {
    if (pathname === "/") return "Feed";
    if (pathname.startsWith("/login")) return "Sign In";
    if (pathname.startsWith("/explore")) return "Explore";
    if (pathname.startsWith("/notifications")) return "Pulse";
    if (pathname.startsWith("/messages")) return "Messages";
    if (pathname.startsWith("/circles")) return "Circles";
    if (pathname.startsWith("/bookmarks")) return "Bookmarks";
    if (pathname.startsWith("/profile")) return "Profile";
    if (pathname.startsWith("/settings")) return "Settings";
    if (pathname.startsWith("/admin")) return "Admin Console";
    if (pathname.startsWith("/developer")) return "Developer API";
    return "ORBA";
  };

  return (
    <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-2.5 bg-obsidian/95 backdrop-blur-xl border-b border-surface-borderLight select-none">
      {/* Brand & Page Context */}
      <div className="flex items-center gap-2.5">
        <Link href="/" className="flex items-center gap-2">
          <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-orba-600 to-accent-cyan p-0.5 shadow-sm shadow-orba-500/20">
            <div className="w-full h-full bg-obsidian rounded-[6px] flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-orba-400 to-accent-cyan" />
            </div>
          </div>
          <span className="font-bold text-sm tracking-tight text-white font-sans">
            ORBA
          </span>
        </Link>
        <span className="text-zinc-600 text-xs">•</span>
        <span className="text-xs font-semibold text-zinc-300 tracking-wide">
          {getPageTitle()}
        </span>
      </div>

      {/* Quick Search & Profile / Sign In Icons */}
      <div className="flex items-center gap-2">
        <Link
          href="/explore"
          aria-label="Search"
          className="p-1.5 rounded-xl bg-surface-elevated text-zinc-400 hover:text-white border border-surface-border transition-colors"
        >
          <Search className="w-4 h-4" />
        </Link>

        {user ? (
          <Link href={`/profile/${user.username}`}>
            <Avatar
              src={profile?.avatar_url}
              alt={profile?.display_name || user.username}
              size="sm"
            />
          </Link>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-orba-600 hover:bg-orba-500 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Login</span>
          </Link>
        )}
      </div>
    </header>
  );
}
