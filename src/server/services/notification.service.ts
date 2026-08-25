import { supabaseAdmin } from "@/lib/supabase/admin";
import { Notification } from "@/types";

export class NotificationService {
  static async getUserNotifications(userId: string, limit = 40): Promise<Notification[]> {
    const { data: notifs, error } = await supabaseAdmin
      .from("notifications")
      .select(`
        *,
        actor:users!notifications_actor_id_fkey(
          username,
          is_verified,
          profiles(*)
        ),
        post:posts!notifications_post_id_fkey(
          id,
          content
        )
      `)
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !notifs) return [];

    return notifs.map((n: any) => {
      const u = n.actor;
      const p = u ? (Array.isArray(u.profiles) ? u.profiles[0] : u.profiles) : undefined;

      return {
        id: n.id,
        recipient_id: n.recipient_id,
        actor_id: n.actor_id,
        type: n.type,
        post_id: n.post_id,
        comment_id: n.comment_id,
        read: n.read ?? false,
        created_at: n.created_at,
        actor: p ? {
          ...p,
          username: u.username || "user",
          is_verified: !!u.is_verified,
        } : undefined,
        post: n.post ? { id: n.post.id, content: n.post.content } : undefined,
      };
    });
  }

  static async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", userId)
      .eq("read", false);

    if (error) return 0;
    return count ?? 0;
  }

  static async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId)
      .eq("recipient_id", userId);

    return !error;
  }

  static async markAllAsRead(userId: string): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from("notifications")
      .update({ read: true })
      .eq("recipient_id", userId)
      .eq("read", false);

    return !error;
  }
}
