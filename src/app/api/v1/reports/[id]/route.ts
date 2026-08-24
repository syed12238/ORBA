import { NextRequest } from "next/server";
import { ModerationService } from "@/server/services/moderation.service";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const adminId = req.headers.get("x-user-id") || undefined;
    const body = await req.json();
    const { status, notes } = body;

    if (!status || !["OPEN", "REVIEWING", "RESOLVED", "REJECTED"].includes(status)) {
      return errorResponse("INVALID_STATUS", "Valid statuses: OPEN, REVIEWING, RESOLVED, REJECTED", 400);
    }

    const updated = ModerationService.updateReportStatus(params.id, status, notes, adminId);
    return successResponse(updated);
  } catch (err: any) {
    return errorResponse("REPORT_UPDATE_ERROR", err.message, 400);
  }
}
