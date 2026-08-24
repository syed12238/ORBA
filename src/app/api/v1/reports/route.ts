import { NextRequest } from "next/server";
import { ModerationService } from "@/server/services/moderation.service";
import { CreateReportSchema } from "@/lib/validators";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get("status") as any || undefined;
    const reports = ModerationService.getReports(status);
    const aiLogs = ModerationService.getAIModerationLogs();
    return successResponse({ reports, aiLogs });
  } catch (err: any) {
    return errorResponse("REPORTS_FETCH_ERROR", err.message, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return errorResponse("UNAUTHORIZED", "Authentication required to submit report", 401);

    const body = await req.json();
    const parsed = CreateReportSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.issues[0].message, 422);
    }

    const report = ModerationService.createReport(userId, parsed.data);
    return successResponse(report, 201);
  } catch (err: any) {
    return errorResponse("REPORT_CREATE_ERROR", err.message, 400);
  }
}
