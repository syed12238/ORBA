import { db } from "../db";
import { Report, ReportStatus, ReportTargetType, AIModerationLog } from "@/types";
import { backgroundQueue } from "../workers/queue";

export class ModerationService {
  static createReport(reporterId: string, data: {
    targetType: ReportTargetType;
    targetId: string;
    reason: string;
  }): Report {
    const state = db.getState();
    const cleanReason = data.reason.trim();
    if (!cleanReason) throw new Error("Please specify a reason for the report.");

    const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newReport: Report = {
      id: reportId,
      reporter_id: reporterId,
      target_type: data.targetType,
      target_id: data.targetId,
      reason: cleanReason,
      status: "OPEN",
      created_at: now,
      updated_at: now,
    };

    state.reports.unshift(newReport);
    db.save();

    backgroundQueue.enqueue("AUDIT_LOG_RECORD", {
      actorId: reporterId,
      action: "REPORT_CREATE",
      resourceType: data.targetType,
      resourceId: data.targetId,
      metadata: { reason: cleanReason },
    });

    return this.enrichReport(newReport);
  }

  static getReports(status?: ReportStatus): Report[] {
    const state = db.getState();
    let reports = [...state.reports];
    if (status) {
      reports = reports.filter(r => r.status === status);
    }
    return reports
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(r => this.enrichReport(r));
  }

  static updateReportStatus(reportId: string, status: ReportStatus, notes?: string, resolvedBy?: string): Report {
    const state = db.getState();
    const report = state.reports.find(r => r.id === reportId);
    if (!report) throw new Error("Report not found.");

    report.status = status;
    if (notes !== undefined) report.notes = notes;
    if (resolvedBy) report.resolved_by = resolvedBy;
    report.updated_at = new Date().toISOString();

    db.save();

    if (resolvedBy) {
      backgroundQueue.enqueue("AUDIT_LOG_RECORD", {
        actorId: resolvedBy,
        action: `REPORT_${status}`,
        resourceType: "REPORT",
        resourceId: reportId,
        metadata: { notes },
      });
    }

    return this.enrichReport(report);
  }

  static getAIModerationLogs(limit = 30): AIModerationLog[] {
    const state = db.getState();
    return state.ai_moderation_logs
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  }

  private static enrichReport(report: Report): Report {
    const state = db.getState();
    const reporterUser = state.users.find(u => u.id === report.reporter_id);
    const reporterProfile = state.profiles.find(p => p.user_id === report.reporter_id);

    let target_preview = "";
    if (report.target_type === "POST") {
      const post = state.posts.find(p => p.id === report.target_id);
      target_preview = post?.content || "[Deleted Post]";
    } else if (report.target_type === "USER") {
      const user = state.users.find(u => u.id === report.target_id);
      target_preview = `@${user?.username || "unknown"}`;
    } else if (report.target_type === "COMMENT") {
      const c = state.comments.find(cm => cm.id === report.target_id);
      target_preview = c?.content || "[Deleted Comment]";
    }

    const ai_evaluation = state.ai_moderation_logs.find(
      l => l.target_type === report.target_type && l.target_id === report.target_id
    );

    return {
      ...report,
      reporter: reporterProfile && reporterUser ? { ...reporterProfile, username: reporterUser.username } : undefined,
      target_preview,
      ai_evaluation,
    };
  }
}
