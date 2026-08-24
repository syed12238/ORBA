"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, Activity, Cpu, HardDrive, Radio, CheckCircle, 
  XCircle, AlertTriangle, Send, RefreshCw, Sparkles 
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getAdminData, getReports, resolveReport, broadcastPulse } from "@/lib/api";
import { Report, AuditLog, AdminMetrics } from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";

export default function AdminPage() {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const fetchAdminData = () => {
    if (!user) return;
    getAdminData()
      .then((data) => {
        setMetrics(data.metrics);
        setAuditLogs(data.auditLogs);
      })
      .catch(console.error);

    getReports()
      .then(setReports)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 6000);
    return () => clearInterval(interval);
  }, [user]);

  const handleResolveReport = async (
    reportId: string,
    status: "RESOLVED" | "REJECTED"
  ) => {
    if (!user) return;
    try {
      await resolveReport(
        reportId,
        status,
        `Actioned by Admin @${user.username} via Trust & Safety Console.`
      );
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status } : r))
      );
      success(`Report marked as ${status}.`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim() || !user) return;

    setIsBroadcasting(true);
    try {
      await broadcastPulse(
        broadcastTitle.trim() || "Global Network Pulse",
        broadcastMessage.trim()
      );
      success("Global pulse broadcasted to all active orbits!");
      setBroadcastTitle("");
      setBroadcastMessage("");
    } catch (err: any) {
      error(err.message || "Failed to broadcast.");
    } finally {
      setIsBroadcasting(false);
    }
  };

  if (isLoading) {
    return <LoadingState text="Connecting to system telemetry matrix..." />;
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 flex flex-col gap-6 pb-24 md:pb-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-borderLight pb-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            Admin Operations & Observability
          </h1>
          <p className="text-xs text-zinc-400">
            Real-time telemetry, queue throughput, AI safety review, and platform governance.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchAdminData}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh
        </Button>
      </div>

      {/* Telemetry Stats Grid */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-surface-card border border-surface-borderLight flex flex-col gap-1">
            <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              Realtime Clients
            </span>
            <span className="text-2xl font-bold text-white font-mono">
              {metrics.overview.activeRealtimeConnections}
            </span>
            <span className="text-[10px] text-emerald-400">SSE bus synchronized</span>
          </div>

          <div className="p-4 rounded-2xl bg-surface-card border border-surface-borderLight flex flex-col gap-1">
            <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-accent-cyan" />
              Queue Avg Latency
            </span>
            <span className="text-2xl font-bold text-white font-mono">
              {metrics.queue.avgLatencyMs}ms
            </span>
            <span className="text-[10px] text-zinc-400">
              {metrics.queue.jobsProcessed} jobs completed
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-surface-card border border-surface-borderLight flex flex-col gap-1">
            <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-orba-400" />
              System Health
            </span>
            <span className="text-2xl font-bold text-emerald-400 font-mono">
              {metrics.health.status}
            </span>
            <span className="text-[10px] text-zinc-400">
              {metrics.health.memoryUsageMb} MB heap
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-surface-card border border-surface-borderLight flex flex-col gap-1">
            <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-accent-amber" />
              Media Storage
            </span>
            <span className="text-2xl font-bold text-white font-mono">
              {metrics.storage.mediaCount} files
            </span>
            <span className="text-[10px] text-zinc-400">{metrics.storage.provider}</span>
          </div>
        </div>
      )}

      {/* Trust & Safety Moderation Queue */}
      <div className="p-5 rounded-2xl bg-surface-card border border-surface-borderLight flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-semibold text-white">
              Trust & Safety Moderation Queue ({reports.length})
            </h3>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">
            Automated Multi-Dimensional AI Triage
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {reports.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500 italic">
              All reported items are resolved. Moderation orbit is clean.
            </div>
          ) : (
            reports.map((rep) => (
              <div
                key={rep.id}
                className="p-4 rounded-xl bg-surface-elevated border border-surface-border flex flex-col gap-2.5 text-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {rep.target_type}
                    </span>
                    <span className="text-zinc-400">
                      Reported by @{rep.reporter?.username || "sentinel"}
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      rep.status === "OPEN"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-emerald-500/20 text-emerald-400"
                    }`}
                  >
                    {rep.status}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-surface-card border border-surface-border text-zinc-200">
                  <span className="text-zinc-400 text-[11px] block mb-0.5 font-mono">
                    Report Reason:
                  </span>
                  {rep.reason}
                </div>

                {/* AI Moderation Diagnostic Pill */}
                {rep.ai_evaluation && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-obsidian border border-surface-border text-[11px] font-mono">
                    <Sparkles className="w-3.5 h-3.5 text-orba-400 shrink-0" />
                    <span className="text-zinc-400">AI Safety Score:</span>
                    <span
                      className={`font-bold ${
                        rep.ai_evaluation.classification === "SAFE"
                          ? "text-emerald-400"
                          : "text-amber-400"
                      }`}
                    >
                      {rep.ai_evaluation.classification} (
                      {(rep.ai_evaluation.confidence * 100).toFixed(1)}%)
                    </span>
                    <span className="text-zinc-400 text-[10px] truncate">
                      {rep.ai_evaluation.reasoning.explanation}
                    </span>
                  </div>
                )}

                {rep.status === "OPEN" && (
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => handleResolveReport(rep.id, "REJECTED")}
                    >
                      Reject Report
                    </Button>
                    <Button
                      size="xs"
                      variant="primary"
                      onClick={() => handleResolveReport(rep.id, "RESOLVED")}
                    >
                      Resolve & Action
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Global Network Broadcast Tool */}
      <div className="p-5 rounded-2xl bg-surface-card border border-surface-borderLight flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Radio className="w-4 h-4 text-emerald-400" />
          Global Platform Broadcast
        </h3>
        <p className="text-xs text-zinc-400">
          Dispatches an instant real-time banner notice to every active browser connected to the ORBA bus.
        </p>

        <form onSubmit={handleBroadcast} className="flex flex-col gap-2.5">
          <input
            type="text"
            value={broadcastTitle}
            onChange={(e) => setBroadcastTitle(e.target.value)}
            placeholder="Broadcast Title (e.g. Scheduled Maintenance Notice)"
            className="p-2.5 rounded-xl bg-surface-elevated border border-surface-border text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
          <textarea
            value={broadcastMessage}
            onChange={(e) => setBroadcastMessage(e.target.value)}
            placeholder="Broadcast message body..."
            rows={2}
            className="p-2.5 rounded-xl bg-surface-elevated border border-surface-border text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 resize-none"
            required
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isBroadcasting}
              disabled={isBroadcasting || !broadcastMessage.trim()}
              leftIcon={<Send className="w-3.5 h-3.5" />}
              className="from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-emerald-600/25"
            >
              Broadcast Global Pulse
            </Button>
          </div>
        </form>
      </div>

      {/* Audit Log Trail */}
      <div className="p-5 rounded-2xl bg-surface-card border border-surface-borderLight flex flex-col gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
          Security Audit Trail (Last 30 Events)
        </span>
        <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto font-mono text-[11px]">
          {auditLogs.map((log) => (
            <div
              key={log.id}
              className="p-2 rounded-lg bg-surface-elevated/60 border border-surface-border/40 flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-orba-400 font-bold">{log.action}</span>
                <span className="text-zinc-400">
                  by @{log.actor?.username || "system"}
                </span>
                <span className="text-zinc-500 truncate">
                  [{log.resource_type}: {log.resource_id}]
                </span>
              </div>
              <span className="text-zinc-500 shrink-0">
                {new Date(log.created_at).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
