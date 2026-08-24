import { request } from "./client";
import { AdminMetrics, AuditLog, Report } from "@/types";

export async function getAdminData(): Promise<{
  metrics: AdminMetrics;
  auditLogs: AuditLog[];
}> {
  return request<{
    metrics: AdminMetrics;
    auditLogs: AuditLog[];
  }>("/api/v1/admin");
}

export async function getReports(status?: string): Promise<Report[]> {
  const query = status ? `?status=${status}` : "";
  const res = await request<{ reports: Report[] }>(`/api/v1/reports${query}`);
  return res.reports || [];
}

export async function resolveReport(
  reportId: string,
  status: "RESOLVED" | "REJECTED",
  notes?: string
): Promise<Report> {
  return request<Report>(`/api/v1/reports/${reportId}`, {
    method: "PATCH",
    body: JSON.stringify({
      status,
      notes,
    }),
  });
}

export async function broadcastPulse(
  title: string,
  message: string
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>("/api/v1/admin", {
    method: "POST",
    body: JSON.stringify({
      action: "broadcast",
      title,
      message,
    }),
  });
}
