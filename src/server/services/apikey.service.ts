import crypto from "crypto";
import { db } from "../db";
import { ApiKey } from "@/types";
import { backgroundQueue } from "../workers/queue";

export class ApiKeyService {
  static generateKey(userId: string, name: string): { apiKey: ApiKey; rawSecret: string } {
    const state = db.getState();
    const cleanName = name.trim();
    if (!cleanName) throw new Error("API Key name is required.");

    const randomBytes = crypto.randomBytes(24).toString("hex");
    const prefix = `orba_live_${randomBytes.substring(0, 6)}`;
    const rawSecret = `${prefix}_${randomBytes.substring(6)}`;
    const keyHash = crypto.createHash("sha256").update(rawSecret).digest("hex");

    const apiKey: ApiKey = {
      id: `key_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: userId,
      name: cleanName,
      key_prefix: prefix,
      key_hash: keyHash,
      status: "ACTIVE",
      last_used_at: null,
      created_at: new Date().toISOString(),
    };

    state.api_keys.push(apiKey);
    db.save();

    backgroundQueue.enqueue("AUDIT_LOG_RECORD", {
      actorId: userId,
      action: "API_KEY_CREATE",
      resourceType: "API_KEY",
      resourceId: apiKey.id,
      metadata: { name: cleanName, prefix },
    });

    return { apiKey, rawSecret };
  }

  static getUserKeys(userId: string): ApiKey[] {
    const state = db.getState();
    return state.api_keys
      .filter(k => k.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  static revokeKey(keyId: string, userId: string): boolean {
    const state = db.getState();
    const key = state.api_keys.find(k => k.id === keyId && k.user_id === userId);
    if (!key) throw new Error("API Key not found.");

    key.status = "REVOKED";
    db.save();

    backgroundQueue.enqueue("AUDIT_LOG_RECORD", {
      actorId: userId,
      action: "API_KEY_REVOKE",
      resourceType: "API_KEY",
      resourceId: keyId,
    });

    return true;
  }

  static verifyKey(rawSecret: string): { valid: boolean; userId?: string } {
    const state = db.getState();
    const keyHash = crypto.createHash("sha256").update(rawSecret.trim()).digest("hex");
    const key = state.api_keys.find(k => k.key_hash === keyHash && k.status === "ACTIVE");
    if (!key) return { valid: false };

    key.last_used_at = new Date().toISOString();
    db.save();
    return { valid: true, userId: key.user_id };
  }
}
