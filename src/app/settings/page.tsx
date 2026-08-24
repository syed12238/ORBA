"use client";

import React, { useState, useEffect } from "react";
import { Settings, Shield, Bell, Lock, Eye, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getUserSettings, updateUserSettings, updateProfile } from "@/lib/api";
import { UserSettings } from "@/types";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

export default function SettingsPage() {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setIsPrivate(!!user.is_private);
    getUserSettings()
      .then(setSettings)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [user]);

  const handleSave = async () => {
    if (!user || !settings) return;
    setIsSaving(true);
    try {
      await updateUserSettings(settings);
      await updateProfile(user.username, { is_private: isPrivate } as any);
      success("Security and privacy preferences updated!");
    } catch (err: any) {
      error(err.message || "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !settings) {
    return <LoadingState text="Loading orbital settings..." />;
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4 flex flex-col gap-6 pb-24 md:pb-12">
      <div className="flex items-center gap-2 border-b border-surface-borderLight pb-3">
        <Settings className="w-5 h-5 text-orba-400" />
        <div>
          <h1 className="text-xl font-bold text-white">Platform Settings & Privacy</h1>
          <p className="text-xs text-zinc-400">
            Control your privacy perimeter, notification routing, and account boundaries.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {/* Privacy Perimeter */}
        <div className="p-5 rounded-2xl bg-surface-card border border-surface-borderLight flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-accent-cyan" />
            Privacy Perimeter
          </h3>

          <div className="flex items-center justify-between py-2 border-b border-surface-border/60">
            <div>
              <div className="text-xs font-semibold text-white">Private Account Orbit</div>
              <div className="text-[11px] text-zinc-400">
                When enabled, new users must request permission to orbit and view your signals.
              </div>
            </div>
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-4 h-4 accent-orba-500 rounded cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-white">
              Who can direct message you?
            </label>
            <select
              value={settings.who_can_message}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  who_can_message: e.target.value as any,
                })
              }
              className="p-2.5 rounded-xl bg-surface-elevated border border-surface-border text-xs text-white focus:outline-none focus:border-orba-500"
            >
              <option value="EVERYONE">Everyone in the ORBA Network</option>
              <option value="FOLLOWING">Only people I Orbit</option>
              <option value="NOBODY">Nobody</option>
            </select>
          </div>
        </div>

        {/* Notification Routing */}
        <div className="p-5 rounded-2xl bg-surface-card border border-surface-borderLight flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-accent-amber" />
            Pulse Routing
          </h3>

          <div className="flex items-center justify-between py-2 border-b border-surface-border/60">
            <div>
              <div className="text-xs font-semibold text-white">In-App Live Badges & Toasts</div>
              <div className="text-[11px] text-zinc-400">Real-time SSE event popups and counter increments.</div>
            </div>
            <input
              type="checkbox"
              checked={settings.in_app_notifications}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  in_app_notifications: e.target.checked,
                })
              }
              className="w-4 h-4 accent-orba-500 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-xs font-semibold text-white">Email Digest & System Notices</div>
              <div className="text-[11px] text-zinc-400">Weekly orbital summary and security alerts.</div>
            </div>
            <input
              type="checkbox"
              checked={settings.email_notifications}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  email_notifications: e.target.checked,
                })
              }
              className="w-4 h-4 accent-orba-500 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            isLoading={isSaving}
          >
            Save Preferences
          </Button>
        </div>
      </div>
    </div>
  );
}
