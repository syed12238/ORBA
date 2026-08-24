import { NextResponse } from "next/server";
import { AdminService } from "@/server/services/admin.service";

export async function GET() {
  const metrics = AdminService.getSystemMetrics();
  return NextResponse.json({
    status: "ok",
    version: "1.0.0",
    system: metrics.health,
    timestamp: new Date().toISOString(),
  });
}
