import { EventEmitter } from "events";

export type RealtimeEventType = 
  | "NOTIFICATION" 
  | "MESSAGE" 
  | "MESSAGE_READ" 
  | "TYPING" 
  | "PRESENCE" 
  | "SIGNAL_LIKE" 
  | "SIGNAL_COMMENT";

export interface RealtimeEventPayload {
  type: RealtimeEventType;
  targetUserId?: string;
  channel?: string;
  data: any;
  timestamp: string;
}

class RealtimeEventBus extends EventEmitter {
  private activeClients = new Map<string, (payload: RealtimeEventPayload) => void>();
  private onlinePresences = new Map<string, { status: "ONLINE" | "AWAY" | "OFFLINE"; lastSeen: number }>();
  private typingState = new Map<string, { userId: string; username: string; timestamp: number }>();

  constructor() {
    super();
    this.setMaxListeners(500);

    // Periodic presence cleanup (mark idle users as AWAY / OFFLINE)
    if (typeof setInterval !== "undefined") {
      setInterval(() => {
        const now = Date.now();
        this.onlinePresences.forEach((val, userId) => {
          if (now - val.lastSeen > 60000 && val.status === "ONLINE") {
            this.onlinePresences.set(userId, { status: "AWAY", lastSeen: val.lastSeen });
            this.broadcastPresence(userId, "AWAY");
          }
        });
      }, 15000);
    }
  }

  public registerClient(clientId: string, userId: string, sendFn: (payload: RealtimeEventPayload) => void): () => void {
    this.activeClients.set(clientId, sendFn);
    this.setPresence(userId, "ONLINE");

    const listener = (payload: RealtimeEventPayload) => {
      if (!payload.targetUserId || payload.targetUserId === userId) {
        sendFn(payload);
      }
    };

    this.on("event", listener);

    return () => {
      this.activeClients.delete(clientId);
      this.off("event", listener);
      // Check if user still has other open tabs
      let hasOtherTab = false;
      this.activeClients.forEach((_, cId) => {
        if (cId.startsWith(`${userId}_`)) hasOtherTab = true;
      });
      if (!hasOtherTab) {
        this.setPresence(userId, "OFFLINE");
      }
    };
  }

  public emitEvent(type: RealtimeEventType, data: any, targetUserId?: string, channel?: string) {
    const payload: RealtimeEventPayload = {
      type,
      targetUserId,
      channel,
      data,
      timestamp: new Date().toISOString(),
    };
    this.emit("event", payload);
  }

  public setPresence(userId: string, status: "ONLINE" | "AWAY" | "OFFLINE") {
    this.onlinePresences.set(userId, { status, lastSeen: Date.now() });
    this.broadcastPresence(userId, status);
  }

  public getPresence(userId: string): "ONLINE" | "AWAY" | "OFFLINE" {
    const p = this.onlinePresences.get(userId);
    if (!p) return "OFFLINE";
    if (Date.now() - p.lastSeen > 120000) return "OFFLINE";
    return p.status;
  }

  public getAllPresences(): Record<string, "ONLINE" | "AWAY" | "OFFLINE"> {
    const result: Record<string, "ONLINE" | "AWAY" | "OFFLINE"> = {};
    this.onlinePresences.forEach((val, uid) => {
      if (Date.now() - val.lastSeen <= 120000) {
        result[uid] = val.status;
      }
    });
    return result;
  }

  public setTyping(conversationId: string, userId: string, username: string, isTyping: boolean) {
    const key = `${conversationId}:${userId}`;
    if (isTyping) {
      this.typingState.set(key, { userId, username, timestamp: Date.now() });
    } else {
      this.typingState.delete(key);
    }

    this.emitEvent("TYPING", {
      conversationId,
      userId,
      username,
      isTyping,
    }, undefined, `conv_${conversationId}`);
  }

  public getActiveConnectionsCount(): number {
    return this.activeClients.size;
  }

  private broadcastPresence(userId: string, status: "ONLINE" | "AWAY" | "OFFLINE") {
    this.emitEvent("PRESENCE", { userId, status });
  }
}

const globalForBus = global as unknown as { orbaRealtimeBus?: RealtimeEventBus };
export const realtimeBus = globalForBus.orbaRealtimeBus || new RealtimeEventBus();
if (process.env.NODE_ENV !== "production") globalForBus.orbaRealtimeBus = realtimeBus;
