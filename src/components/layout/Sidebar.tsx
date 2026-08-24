"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  PlusCircle, ChevronUp, LogOut, LogIn, 
  Shield, User as UserIcon, Settings as SettingsIcon 
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRealtime } from "@/context/RealtimeContext";
import { PRIMARY_NAV_ITEMS, SECONDARY_NAV_ITEMS } from "@/config/navigation";
import { Avatar } from "../ui/Avatar";
import { Tooltip } from "../ui/Tooltip";
import { PostComposer } from "../feed/PostComposer";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, logout, supabaseUser } = useAuth();
  const { unreadCount, isConnected } = useRealtime();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleEmitClick = () => {
    if (!user) {
      router.push("/login");
      return;
    }
    setIsCreateOpen(true);
  };

  return (
    <>
      <aside className="hidden md:flex flex-col justify-between w-20 lg:w-64 xl:w-72 h-screen sticky top-0 px-2 lg:px-4 py-6 border-r border-surface-borderLight bg-obsidian/95 backdrop-blur-xl select-none z-30">
        <div className="flex flex-col gap-6">
          {/* Brand Header */}
          <Link href="/" className="flex items-center gap-3 px-2 lg:px-3 py-1 group">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-orba-600 via-orba-500 to-accent-cyan p-0.5 shadow-lg shadow-orba-500/20 group-hover:scale-105 transition-transform duration-300">
              <div className="w-full h-full bg-obsidian rounded-[10px] flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 rounded-full border border-orba-400/40 animate-orbit-slow" />
                <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-orba-400 to-accent-cyan shadow-sm shadow-accent-cyan/50" />
              </div>
            </div>
            <div className="hidden lg:flex flex-col">
              <span className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5 font-sans">
                ORBA
              </span>
              <span className="text-[11px] text-zinc-400 font-medium tracking-wide">
                Where conversations orbit
              </span>
            </div>
          </Link>

          {/* Primary Navigation */}
          <nav className="flex flex-col gap-1">
            {PRIMARY_NAV_ITEMS.map((item) => {
              let href = item.href;
              if (item.label === "Profile") {
                href = user ? `/profile/${user.username}` : "/login";
              }

              const isActive =
                pathname === href || (href !== "/" && pathname.startsWith(href));
              const Icon = item.icon;
              const badgeValue =
                item.badgeKey === "unreadCount" && unreadCount > 0 && user
                  ? unreadCount
                  : undefined;

              const navLink = (
                <Link
                  key={item.label}
                  href={href}
                  className={`relative flex items-center justify-center lg:justify-between px-3 py-2.5 rounded-xl font-medium text-xs transition-all duration-150 group ${
                    isActive
                      ? "bg-surface-elevated text-white shadow-sm border border-surface-borderLight"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-surface-hover/70"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Icon
                        className={`w-5 h-5 transition-colors ${
                          isActive ? "text-orba-400" : "text-zinc-400 group-hover:text-zinc-200"
                        }`}
                      />
                      {badgeValue !== undefined && (
                        <span className="lg:hidden absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-orba-500 ring-2 ring-obsidian" />
                      )}
                    </div>
                    <span className="hidden lg:inline tracking-wide font-sans">{item.label}</span>
                  </div>

                  {badgeValue !== undefined && (
                    <span className="hidden lg:inline-flex px-2 py-0.5 text-[11px] font-mono font-bold rounded-full bg-orba-500 text-white shadow-sm animate-pulse">
                      {badgeValue}
                    </span>
                  )}

                  {isActive && (
                    <div className="hidden lg:block absolute left-0 top-2 bottom-2 w-1 rounded-r bg-orba-400" />
                  )}
                </Link>
              );

              return (
                <div key={item.label} className="w-full">
                  <div className="lg:hidden">
                    <Tooltip content={item.label} side="right">
                      {navLink}
                    </Tooltip>
                  </div>
                  <div className="hidden lg:block">{navLink}</div>
                </div>
              );
            })}
          </nav>

          {/* Emit Signal CTA Button */}
          <button
            onClick={handleEmitClick}
            className="flex items-center justify-center gap-2 w-full py-3 px-3 rounded-xl bg-gradient-to-r from-orba-600 to-orba-500 hover:from-orba-500 hover:to-orba-400 text-white font-semibold text-xs shadow-lg shadow-orba-500/25 hover:shadow-orba-500/40 active:scale-[0.98] transition-all duration-150 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden lg:inline">{user ? "Emit Signal" : "Sign In to Post"}</span>
          </button>

          {/* Secondary Nav Items */}
          {SECONDARY_NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === "ADMIN").length > 0 && (
            <div className="pt-3 border-t border-surface-borderLight flex flex-col gap-0.5">
              <div className="hidden lg:block px-3 pb-1 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                Ecosystem
              </div>
              {SECONDARY_NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === "ADMIN").map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;

                const secLink = (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center justify-center lg:justify-start gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? "text-orba-300 bg-surface-elevated/80 font-semibold"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-surface-hover/50"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </Link>
                );

                return (
                  <div key={item.label} className="w-full">
                    <div className="lg:hidden">
                      <Tooltip content={item.label} side="right">
                        {secLink}
                      </Tooltip>
                    </div>
                    <div className="hidden lg:block">{secLink}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* User Profile / Login Drawer */}
        <div className="relative pt-4 border-t border-surface-borderLight">
          {user ? (
            <>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center justify-between w-full p-2 rounded-xl hover:bg-surface-hover/80 transition-colors border border-surface-border bg-surface-card text-left group cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar
                    src={profile?.avatar_url}
                    alt={profile?.display_name || user.username}
                    size="sm"
                    presence={isConnected ? "ONLINE" : "AWAY"}
                  />
                  <div className="hidden lg:flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-white truncate group-hover:text-orba-300 transition-colors">
                      {profile?.display_name || user.username}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono truncate">
                      @{user.username}
                    </span>
                  </div>
                </div>
                <ChevronUp
                  className={`hidden lg:block w-3.5 h-3.5 text-zinc-400 transition-transform ${
                    isUserMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* User Account Popover */}
              {isUserMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 lg:w-64 mb-2 p-2 rounded-2xl bg-surface-card border border-surface-borderLight shadow-2xl backdrop-blur-2xl z-50 animate-scale-in flex flex-col gap-1">
                  {supabaseUser && (
                    <div className="p-2 mb-1 rounded-xl bg-surface-elevated border border-surface-border flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 font-bold uppercase">
                        <Shield className="w-3 h-3" />
                        <span>Google Account</span>
                      </div>
                      <span className="text-xs font-semibold text-white truncate">{supabaseUser.email}</span>
                    </div>
                  )}

                  <Link
                    href={`/profile/${user.username}`}
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-zinc-200 hover:text-white hover:bg-surface-hover transition-colors"
                  >
                    <UserIcon className="w-4 h-4 text-zinc-400" />
                    <span>View Profile</span>
                  </Link>

                  <Link
                    href="/settings"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-zinc-200 hover:text-white hover:bg-surface-hover transition-colors"
                  >
                    <SettingsIcon className="w-4 h-4 text-zinc-400" />
                    <span>Account Settings</span>
                  </Link>

                  {/* Sign Out */}
                  <div className="pt-2 mt-1 border-t border-surface-border">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-orba-600 hover:bg-orba-500 text-white font-semibold text-xs shadow-md transition-all text-center"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden lg:inline">Sign In</span>
              </Link>
              <Link
                href="/login?tab=guest"
                className="hidden lg:flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-surface-border text-zinc-300 text-xs font-medium transition-colors text-center"
              >
                <span>Create Handle</span>
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Post Composer Modal */}
      {isCreateOpen && (
        <PostComposer isModal={true} onClose={() => setIsCreateOpen(false)} />
      )}
    </>
  );
}
