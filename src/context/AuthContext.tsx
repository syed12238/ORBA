"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, Profile } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { type Session, type User as SupabaseUser } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  supabaseUser: SupabaseUser | null;
  isLoading: boolean;
  isAuthenticating: boolean;
  signInWithGoogle: (next?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateLocalProfile: (profile: Partial<Profile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // 1. Initialize Auth & listen to Supabase state changes
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        // Handle OAuth code exchange if redirected with ?code= in the URL
        if (typeof window !== "undefined") {
          const urlParams = new URLSearchParams(window.location.search);
          const code = urlParams.get("code");
          if (code) {
            try {
              const { data: codeData, error: codeErr } = await supabase.auth.exchangeCodeForSession(code);
              if (!codeErr && codeData?.session?.user) {
                if (mounted) {
                  setSession(codeData.session);
                  setSupabaseUser(codeData.session.user);
                }
                await syncAndLoadUser(codeData.session.user);
              }
            } catch (exchangeErr) {
              console.warn("Client-side code exchange error:", exchangeErr);
            } finally {
              // Clean code from the URL bar without reloading
              const cleanUrl = window.location.pathname + (window.location.hash || "");
              window.history.replaceState({}, document.title, cleanUrl);
            }
          }
        }

        // Check Supabase session
        const { data: { session: initialSession } } = await supabase.auth.getSession();

        if (initialSession?.user) {
          if (mounted) {
            setSession(initialSession);
            setSupabaseUser(initialSession.user);
          }
          await syncAndLoadUser(initialSession.user);
        } else {
          // Check saved session preference if user logged in as guest
          const savedUserId = typeof window !== "undefined" ? localStorage.getItem("orba_user_id") : null;
          if (savedUserId) {
            const userRes = await fetch(`/api/v1/auth?userId=${savedUserId}`);
            const userJson = await userRes.json();
            if (userJson.data?.user && mounted) {
              setUser(userJson.data.user);
              setProfile(userJson.data.profile);
            } else if (mounted) {
              localStorage.removeItem("orba_user_id");
            }
          }
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initAuth();

    // Listen to Supabase Auth State changes (Sign in, Sign out, Token refreshed)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;
      setSession(currentSession);
      setSupabaseUser(currentSession?.user || null);

      if (event === "SIGNED_IN" && currentSession?.user) {
        setIsLoading(true);
        await syncAndLoadUser(currentSession.user);
        setIsLoading(false);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem("orba_user_id");
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Synchronize Supabase User with ORBA backend profile store
  const syncAndLoadUser = async (sbUser: SupabaseUser) => {
    try {
      const res = await fetch("/api/v1/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync_supabase",
          supabaseId: sbUser.id,
          email: sbUser.email,
          displayName: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name,
          avatarUrl: sbUser.user_metadata?.avatar_url || sbUser.user_metadata?.picture,
        }),
      });
      const json = await res.json();
      if (json.data?.user) {
        setUser(json.data.user);
        setProfile(json.data.profile);
        if (typeof window !== "undefined") {
          localStorage.setItem("orba_user_id", json.data.user.id);
        }
      }
    } catch (err) {
      console.error("Failed to sync Supabase user:", err);
    }
  };

  // Google Sign-In Trigger
  const signInWithGoogle = async (next: string = "/") => {
    setIsAuthenticating(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) throw error;
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Logout Trigger
  const logout = async () => {
    setIsLoading(true);
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("orba_user_id");
      }
      try {
        await supabase.auth.signOut();
      } catch (sbErr) {
        console.warn("Supabase signOut notice:", sbErr);
      }
      setUser(null);
      setProfile(null);
      setSession(null);
      setSupabaseUser(null);
      
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateLocalProfile = (newProfileData: Partial<Profile>) => {
    setProfile((prev) => (prev ? { ...prev, ...newProfileData } : (newProfileData as Profile)));
    setUser((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        profile: prev.profile ? { ...prev.profile, ...newProfileData } : (newProfileData as Profile),
      };
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        supabaseUser,
        isLoading,
        isAuthenticating,
        signInWithGoogle,
        logout,
        updateLocalProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
