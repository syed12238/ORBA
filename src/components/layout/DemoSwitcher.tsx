"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ShieldCheck, LogIn, User, Sparkles, LogOut, ChevronDown } from "lucide-react";
import { Avatar } from "../ui/Avatar";

export function DemoSwitcher() {
  const { user, profile, switchDemoUser, demoUsers, supabaseUser, logout } = useAuth();
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);

  return (
    <div className="w-full bg-[#07090e]/95 border-b border-surface-borderLight/80 px-4 py-1.5 text-xs flex flex-wrap items-center justify-between gap-3 select-none z-30 sticky top-0 backdrop-blur-md">
      {/* Left side: Auth Status */}
      <div className="flex items-center gap-2.5">
        {supabaseUser ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate max-w-[200px] sm:max-w-xs">{supabaseUser.email}</span>
            <span className="text-emerald-500 text-[10px] uppercase tracking-wider font-bold">Verified</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-surface-elevated border border-surface-border text-zinc-400 text-[10px] font-mono">
              Guest Orbit
            </span>
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orba-600/20 hover:bg-orba-600/30 border border-orba-500/40 text-orba-300 font-medium text-[11px] transition-all hover:scale-[1.02]"
            >
              <LogIn className="w-3 h-3 text-orba-400" />
              <span>Connect Google</span>
            </Link>
          </div>
        )}
      </div>

      {/* Center / Right: Current Active User Profile & Persona Switcher */}
      <div className="flex items-center gap-2 relative">
        <div className="flex items-center gap-2">
          <Avatar src={profile?.avatar_url} alt={profile?.display_name || "User"} size="xs" />
          <span className="text-zinc-200 text-xs font-semibold hidden sm:inline">
            {profile?.display_name || user?.username}
          </span>
          <span className="text-zinc-500 font-mono text-[11px]">
            @{user?.username}
          </span>
        </div>

        {/* Quick Persona Dropdown Toggle for testing different perspectives */}
        <div className="relative">
          <button
            onClick={() => setShowPersonaMenu(!showPersonaMenu)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-elevated hover:bg-surface-hover border border-surface-border text-zinc-300 text-[11px] font-medium transition-colors cursor-pointer"
            title="Switch social account"
          >
            <span>Switch Orbit</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showPersonaMenu ? "rotate-180" : ""}`} />
          </button>

          {showPersonaMenu && (
            <div className="absolute right-0 top-full mt-2 w-64 p-2 rounded-2xl bg-surface-card border border-surface-borderLight shadow-2xl backdrop-blur-2xl z-50 animate-scale-in flex flex-col gap-1">
              <div className="px-2.5 py-1 text-[10px] font-mono uppercase text-zinc-400 font-bold tracking-wider flex items-center justify-between">
                <span>Select Orbit Persona</span>
                <Sparkles className="w-3 h-3 text-orba-400" />
              </div>

              <div className="max-h-52 overflow-y-auto flex flex-col gap-0.5">
                {demoUsers.map((du) => {
                  const isCurrent = du.id === user?.id;
                  return (
                    <button
                      key={du.id}
                      onClick={() => {
                        switchDemoUser(du.id);
                        setShowPersonaMenu(false);
                      }}
                      className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                        isCurrent
                          ? "bg-orba-600/20 text-orba-300 border border-orba-500/30 font-semibold"
                          : "hover:bg-surface-hover text-zinc-300 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar src={du.avatar_url} alt={du.display_name} size="xs" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs truncate font-medium">{du.display_name}</span>
                          <span className="text-[10px] font-mono text-zinc-500">@{du.username}</span>
                        </div>
                      </div>
                      {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-orba-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <div className="pt-1.5 mt-1 border-t border-surface-border flex items-center justify-between">
                <Link
                  href="/login"
                  onClick={() => setShowPersonaMenu(false)}
                  className="text-[11px] text-orba-400 hover:text-orba-300 font-medium px-2 py-1"
                >
                  Manage Logins →
                </Link>
                <button
                  onClick={() => {
                    setShowPersonaMenu(false);
                    logout();
                  }}
                  className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 px-2 py-1 cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
