import { db } from "../db";
import { Notification } from "@/types";

export class NotificationService {
  static getUserNotifications(userId: string, limit = 40): Notification[] {
    const state = db.getState();
    const notifs = state.notifications
      .filter(n => n.recipient_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);

    return notifs.map(n => {
      const actorUser = state.users.find(u => u.id === n.actor_id);
      const actorProfile = state.profiles.find(p => p.user_id === n.actor_id);
      const post = n.post_id ? state.posts.find(p => p.id === n.post_id) : undefined;

      return {
        ...n,
        actor: actorProfile && actorUser ? { ...actorProfile, username: actorUser.username, is_verified: actorUser.is_verified } : undefined,
        post: post ? { id: post.id, content: post.content } : undefined,
      };
    });
  }

  static getUnreadCount(userId: string): number {
    const state = db.getState();
    return state.notifications.filter(n => n.recipient_id === userId && !n.read).length;
  }

  static markAsRead(notificationId: string, userId: string): boolean {
    const state = db.getState();
    const notif = state.notifications.find(n => n.id === notificationId && n.recipient_id === userId);
    if (!notif) return false;
    notif.read = true;
    db.save();
    return true;
  }

  static markAllAsRead(userId: string): boolean {
    const state = db.getState();
    state.notifications
      .filter(n => n.recipient_id === userId && !n.read)
      .forEach(n => { n.read = true; });
    db.save();
    return true;
  }
}
