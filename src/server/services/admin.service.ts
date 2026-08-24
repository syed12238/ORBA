import { db } from "../db";
import { AuditLog } from "@/types";
import { backgroundQueue } from "../workers/queue";
import { realtimeBus } from "../realtime/event-bus";

export class AdminService {
  static getSystemMetrics() {
    const state = db.getState();
    const queueStats = backgroundQueue.getStats();
    const activeWs = realtimeBus.getActiveConnectionsCount();

    const totalUsers = state.users.length;
    const totalSignals = state.posts.length;
    const totalComments = state.comments.length;
    const totalLikes = state.post_likes.length;
    const openReports = state.reports.filter(r => r.status === "OPEN").length;

    return {
      overview: {
        totalUsers,
        totalSignals,
        totalComments,
        totalLikes,
        openReports,
        activeRealtimeConnections: Math.max(1, activeWs),
      },
      queue: queueStats,
      storage: {
        mediaCount: state.media.length,
        totalBytes: state.media.reduce((acc, m) => acc + (m.file_size || 0), 0),
        provider: "Abstracted (Supabase / Local)",
      },
      health: {
        status: "HEALTHY",
        uptimeSeconds: Math.floor(process.uptime()),
        memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        nodeVersion: process.version,
      }
    };
  }

  static getAuditLogs(limit = 40): AuditLog[] {
    const state = db.getState();
    return state.audit_logs
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)
      .map(log => {
        const user = log.actor_id ? state.users.find(u => u.id === log.actor_id) : undefined;
        const profile = log.actor_id ? state.profiles.find(p => p.user_id === log.actor_id) : undefined;
        return {
          ...log,
          actor: profile && user ? { ...profile, username: user.username } : undefined,
        };
      });
  }

  static toggleUserSuspension(targetUserId: string, adminId: string): boolean {
    const state = db.getState();
    const user = state.users.find(u => u.id === targetUserId);
    if (!user) throw new Error("User not found.");

    user.is_suspended = !user.is_suspended;
    db.save();

    backgroundQueue.enqueue("AUDIT_LOG_RECORD", {
      actorId: adminId,
      action: user.is_suspended ? "USER_SUSPEND" : "USER_UNSUSPEND",
      resourceType: "USER",
      resourceId: targetUserId,
      metadata: { username: user.username },
    });

    return user.is_suspended;
  }

  static broadcastPulse(title: string, message: string, adminId: string) {
    const state = db.getState();
    for (const u of state.users) {
      realtimeBus.emitEvent("NOTIFICATION", {
        type: "SYSTEM_BROADCAST",
        title,
        message,
        timestamp: new Date().toISOString(),
      }, u.id);
    }

    backgroundQueue.enqueue("AUDIT_LOG_RECORD", {
      actorId: adminId,
      action: "SYSTEM_BROADCAST",
      resourceType: "GLOBAL",
      metadata: { title, message },
    });

    return true;
  }
}
