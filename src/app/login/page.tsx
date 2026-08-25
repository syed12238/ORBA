"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Shield, AlertCircle, ArrowRight, Loader2, 
  UserPlus, Compass
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

function GoogleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#EA4335"
        d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
      />
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
      />
      <path
        fill="#FBBC05"
        d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2s.7 5.5 1.9 7.9l3.7-2.9z"
      />
      <path
        fill="#34A853"
        d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"
      />
    </svg>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawError = searchParams.get("error");
  const tabParam = searchParams.get("tab");
  const next = searchParams.get("next") || "/";

  const { user, signInWithGoogle, isAuthenticating } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"google" | "guest">(tabParam === "guest" ? "guest" : "google");

  // Guest Registration
  const [guestName, setGuestName] = useState("");
  const [guestUsername, setGuestUsername] = useState("");
  const [isRegisteringGuest, setIsRegisteringGuest] = useState(false);

  useEffect(() => {
    if (rawError) {
      setErrorMessage(decodeURIComponent(rawError));
    }
  }, [rawError]);

  useEffect(() => {
    if (user && !isAuthenticating) {
      router.push(next);
    }
  }, [user, isAuthenticating, next, router]);

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    try {
      await signInWithGoogle(next);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to initiate Google authentication.");
    }
  };

  const handleCreateCustomGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestUsername.trim()) {
      setErrorMessage("Please enter a username handle.");
      return;
    }

    setIsRegisteringGuest(true);
    setErrorMessage(null);

    try {
      const cleanUser = guestUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
      if (cleanUser.length < 3) {
        throw new Error("Username must be at least 3 characters.");
      }

      const res = await fetch("/api/v1/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          username: cleanUser,
          displayName: guestName.trim() || cleanUser,
          email: `${cleanUser}@guest.orba.app`,
          bio: "Joined the ORBA social ecosystem.",
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error?.message || "Failed to create account.");
      }

      if (json.data?.user) {
        if (typeof window !== "undefined") {
          localStorage.setItem("orba_user_id", json.data.user.id);
          window.location.href = next;
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create account.");
    } finally {
      setIsRegisteringGuest(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 dot-grid-bg relative">
      {/* Page-level ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-orba-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-accent-cyan/4 blur-[120px] pointer-events-none" />
      <div className="w-full max-w-md p-8 rounded-3xl glass-card shadow-glass-elevated flex flex-col gap-6 relative overflow-hidden animate-scale-in">
        {/* Glow ambient background accents */}
        <div className="absolute -top-24 -right-24 w-52 h-52 rounded-full bg-orba-500/8 blur-3xl pointer-events-none animate-pulse-glow" />
        <div className="absolute -bottom-24 -left-24 w-52 h-52 rounded-full bg-accent-cyan/8 blur-3xl pointer-events-none animate-pulse-glow" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-accent-purple/4 blur-[80px] pointer-events-none" />

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center gap-3 relative z-10">
          <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orba-600 via-orba-500 to-accent-cyan p-0.5 shadow-glow-orba animate-float">
            <div className="w-full h-full bg-obsidian rounded-[14px] flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 rounded-full border border-orba-400/30 animate-orbit-slow" />
              <div className="absolute inset-2 rounded-full border border-accent-cyan/15 animate-orbit-medium" />
              <div className="w-4.5 h-4.5 rounded-full bg-gradient-to-tr from-orba-400 to-accent-cyan shadow-md shadow-accent-cyan/40 animate-glow-pulse" />
            </div>
          </div>

          <div className="flex flex-col">
            <h1 className="text-2xl font-extrabold tracking-tight font-sans">
              <span className="text-gradient-orba">Enter ORBA</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-1.5 max-w-xs leading-relaxed">
              Real-time social discourse, deterministic feeds, and community circles.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-surface-elevated/80 rounded-xl border border-surface-borderLight/50 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("google")}
            className={`py-2.5 px-3 rounded-lg transition-all duration-200 text-center cursor-pointer ${
              activeTab === "google"
                ? "bg-gradient-to-r from-orba-600 to-orba-500 text-white shadow-sm font-bold"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            Google Sign-In
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("guest")}
            className={`py-2.5 px-3 rounded-lg transition-all duration-200 text-center cursor-pointer ${
              activeTab === "guest"
                ? "bg-gradient-to-r from-orba-600 to-orba-500 text-white shadow-sm font-bold"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            Create Handle
          </button>
        </div>

        {/* TAB 1: Google OAuth */}
        {activeTab === "google" && (
          <div className="flex flex-col gap-4 relative z-10 animate-fade-in">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isAuthenticating}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-white hover:bg-zinc-50 active:scale-[0.98] text-zinc-900 font-bold text-sm shadow-glass-elevated border border-zinc-200/80 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed group cursor-pointer"
            >
              {isAuthenticating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-zinc-700" />
                  <span>Redirecting to Google OAuth...</span>
                </>
              ) : (
                <>
                  <GoogleIcon className="w-5 h-5 shrink-0 group-hover:scale-105 transition-transform" />
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-500 font-mono pt-1">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Real Google Cloud & Supabase OAuth</span>
            </div>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-surface-border"></div>
              <span className="flex-shrink mx-4 text-[11px] text-zinc-500 font-mono">OR</span>
              <div className="flex-grow border-t border-surface-border"></div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab("guest")}
              className="w-full py-3 px-4 rounded-2xl bg-surface-elevated hover:bg-surface-hover border border-surface-borderLight text-zinc-200 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Compass className="w-4 h-4 text-orba-400" />
              <span>Create a Custom Guest Handle</span>
            </button>
          </div>
        )}

        {/* TAB 2: Custom Guest Profile */}
        {activeTab === "guest" && (
          <form onSubmit={handleCreateCustomGuest} className="flex flex-col gap-3 relative z-10 animate-fade-in">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="e.g. Alex Rivera"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-elevated border border-surface-border focus:border-orba-500 focus:outline-none text-white text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Username handle <span className="text-rose-400">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-zinc-500 font-mono text-xs">@</span>
                <input
                  type="text"
                  required
                  value={guestUsername}
                  onChange={(e) => setGuestUsername(e.target.value)}
                  placeholder="alex_rivera"
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-surface-elevated border border-surface-border focus:border-orba-500 focus:outline-none text-white text-xs font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isRegisteringGuest}
              className="mt-2 w-full py-3 rounded-2xl bg-gradient-to-r from-orba-600 to-accent-cyan hover:opacity-95 text-white font-semibold text-xs shadow-lg shadow-orba-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {isRegisteringGuest ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Entering Orbit...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account & Enter</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Public Feed Trajectory Link */}
        <div className="pt-4 border-t border-surface-border/60 flex items-center justify-between text-xs text-zinc-400">
          <span>Just browsing?</span>
          <Link
            href="/"
            className="text-orba-400 hover:text-orba-300 font-semibold flex items-center gap-1 group"
          >
            <span>Browse public feed</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[85vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-orba-400 animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
