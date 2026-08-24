import { NextRequest } from "next/server";
import { NotificationService } from "@/server/services/notification.service";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id") || req.nextUrl.searchParams.get("userId");
    if (!userId) return errorResponse("UNAUTHORIZED", "Authentication required", 401);

    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "40", 10);
    const notifications = NotificationService.getUserNotifications(userId, limit);
    const unreadCount = NotificationService.getUnreadCount(userId);

    return successResponse({ notifications, unreadCount });
  } catch (err: any) {
    return errorResponse("NOTIFICATIONS_FETCH_ERROR", err.message, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return errorResponse("UNAUTHORIZED", "Authentication required", 401);

    const body = await req.json().catch(() => ({}));
    if (body.notificationId) {
      NotificationService.markAsRead(body.notificationId, userId);
    } else {
      NotificationService.markAllAsRead(userId);
    }

    return successResponse({ success: true });
  } catch (err: any) {
    return errorResponse("NOTIFICATIONS_UPDATE_ERROR", err.message, 400);
  }
}
