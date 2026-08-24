import { NextRequest } from "next/server";
import { AdminService } from "@/server/services/admin.service";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const metrics = AdminService.getSystemMetrics();
    const auditLogs = AdminService.getAuditLogs(30);
    return successResponse({ metrics, auditLogs });
  } catch (err: any) {
    return errorResponse("ADMIN_FETCH_ERROR", err.message, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminId = req.headers.get("x-user-id") || "u_hamza_001";
    const body = await req.json();
    const action = body.action;

    if (action === "suspend_user") {
      const isSuspended = AdminService.toggleUserSuspension(body.targetUserId, adminId);
      return successResponse({ isSuspended, userId: body.targetUserId });
    }

    if (action === "broadcast") {
      AdminService.broadcastPulse(body.title, body.message, adminId);
      return successResponse({ broadcasted: true });
    }

    return errorResponse("INVALID_ACTION", `Unknown admin action: ${action}`, 400);
  } catch (err: any) {
    return errorResponse("ADMIN_ACTION_ERROR", err.message, 400);
  }
}
