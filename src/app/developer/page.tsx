"use client";

import React, { useState, useEffect } from "react";
import { Terminal, Key, Plus, Copy, Trash2, Play, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getApiKeys, createApiKey, revokeApiKey } from "@/lib/api";
import { ApiKey } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";

export default function DeveloperPage() {
  const { user } = useAuth();
  const { success, error, info } = useToast();

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [keyName, setKeyName] = useState("");
  const [newGeneratedSecret, setNewGeneratedSecret] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Interactive Test Runner State
  const [testEndpoint, setTestEndpoint] = useState("/api/v1/health");
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const fetchKeysList = () => {
    if (!user) return;
    getApiKeys()
      .then(setApiKeys)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchKeysList();
  }, [user]);

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim() || !user) return;

    setIsCreating(true);
    try {
      const res = await createApiKey(keyName.trim());
      setNewGeneratedSecret(res.rawSecret);
      setKeyName("");
      fetchKeysList();
      success("API Key generated!");
    } catch (err: any) {
      error(err.message || "Failed to generate key.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!user) return;
    try {
      await revokeApiKey(keyId);
      setApiKeys((prev) =>
        prev.map((k) => (k.id === keyId ? { ...k, status: "REVOKED" } : k))
      );
      info("API Key revoked.");
    } catch (e) {
      console.error(e);
    }
  };

  const runTestRequest = async () => {
    setIsTesting(true);
    try {
      const res = await fetch(testEndpoint);
      const json = await res.json();
      setTestResponse(JSON.stringify(json, null, 2));
    } catch (err: any) {
      setTestResponse(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return <LoadingState text="Loading developer portal..." />;
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-4 flex flex-col gap-6 pb-24 md:pb-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-borderLight pb-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-orba-400" />
            Developer Platform & API Keys
          </h1>
          <p className="text-xs text-zinc-400">
            Build orbital bots, telemetry listeners, and automated signal emitters via the REST & Realtime APIs.
          </p>
        </div>
      </div>

      {/* Generated Secret Banner (Shown once) */}
      {newGeneratedSecret && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 flex flex-col gap-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 font-mono">
              <Key className="w-4 h-4" />
              API Secret Generated — Save Now
            </span>
            <button
              onClick={() => setNewGeneratedSecret(null)}
              className="text-xs text-emerald-400 hover:text-white"
            >
              Dismiss
            </button>
          </div>
          <p className="text-xs text-emerald-300">
            This secret will never be displayed again. Store it securely in your secrets manager:
          </p>
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-obsidian border border-emerald-500/30 font-mono text-xs text-white">
            <span className="truncate">{newGeneratedSecret}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(newGeneratedSecret);
                success("API Key copied to clipboard!");
              }}
              className="p-1.5 rounded-lg bg-emerald-700/50 hover:bg-emerald-600 text-white ml-2 shrink-0 transition-colors"
              aria-label="Copy key"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Generate API Key Form */}
      <div className="p-5 rounded-2xl bg-surface-card border border-surface-borderLight flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Key className="w-4 h-4 text-orba-400" />
          Create New API Access Key
        </h3>
        <form onSubmit={handleGenerateKey} className="flex gap-2">
          <Input
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            placeholder="e.g. Telemetry Ingestion Worker Key"
            required
            className="flex-1"
          />
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isCreating}
            disabled={isCreating || !keyName.trim()}
          >
            Generate Key
          </Button>
        </form>
      </div>

      {/* Active API Keys Table */}
      <div className="p-5 rounded-2xl bg-surface-card border border-surface-borderLight flex flex-col gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
          Your API Keys ({apiKeys.length})
        </span>

        <div className="flex flex-col gap-2">
          {apiKeys.length === 0 ? (
            <div className="py-6 text-center text-xs text-zinc-500 italic">
              No API keys created yet.
            </div>
          ) : (
            apiKeys.map((k) => (
              <div
                key={k.id}
                className="p-3 rounded-xl bg-surface-elevated border border-surface-border flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-white truncate">{k.name}</span>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
                    <span className="text-orba-400">{k.key_prefix}...</span>
                    <span>•</span>
                    <span>Created {new Date(k.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={k.status === "ACTIVE" ? "success" : "danger"}>
                    {k.status}
                  </Badge>
                  {k.status === "ACTIVE" && (
                    <button
                      onClick={() => handleRevokeKey(k.id)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                      title="Revoke Key"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Interactive REST API Playground */}
      <div className="p-5 rounded-2xl bg-surface-card border border-surface-borderLight flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-accent-cyan" />
            Interactive API Playground
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={runTestRequest}
            isLoading={isTesting}
            leftIcon={<Play className="w-3 h-3 text-accent-cyan" />}
          >
            Execute GET
          </Button>
        </div>

        <select
          value={testEndpoint}
          onChange={(e) => setTestEndpoint(e.target.value)}
          className="p-2.5 rounded-xl bg-surface-elevated border border-surface-border text-xs text-white font-mono focus:outline-none focus:border-orba-500"
        >
          <option value="/api/v1/health">GET /api/v1/health (System Health & Observability)</option>
          <option value="/api/v1/feed?limit=2">GET /api/v1/feed?limit=2 (Feed Scored Stream)</option>
          <option value="/api/v1/circles">GET /api/v1/circles (Active Communities)</option>
          <option value="/api/v1/search?q=quantum">GET /api/v1/search?q=quantum (Multi-Entity Search)</option>
        </select>

        {testResponse && (
          <pre className="p-4 rounded-xl bg-obsidian border border-surface-border text-[11px] font-mono text-zinc-300 max-h-60 overflow-y-auto leading-relaxed">
            {testResponse}
          </pre>
        )}
      </div>
    </div>
  );
}
