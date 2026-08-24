import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { IStorageService, UploadOptions, UploadResult } from "./storage.interface";
import { LocalStorageProvider } from "./local.provider";

export class SupabaseStorageProvider implements IStorageService {
  private supabase: SupabaseClient | null = null;
  private defaultBucket: string;
  private localFallback: LocalStorageProvider;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    this.defaultBucket = process.env.SUPABASE_STORAGE_BUCKET || "orba-media";
    this.localFallback = new LocalStorageProvider();

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  async upload(fileBuffer: Buffer, fileName: string, options?: UploadOptions): Promise<UploadResult> {
    if (!this.supabase) {
      return this.localFallback.upload(fileBuffer, fileName, options);
    }

    try {
      const bucket = options?.bucket || this.defaultBucket;
      const folder = options?.folder ? `${options.folder}/` : "";
      const uniqueFileName = `${folder}${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

      const { data, error } = await this.supabase.storage
        .from(bucket)
        .upload(uniqueFileName, fileBuffer, {
          contentType: options?.contentType,
          upsert: false,
        });

      if (error || !data) {
        console.warn(`Supabase storage upload error (${error?.message}), falling back to local persistent storage.`);
        return this.localFallback.upload(fileBuffer, fileName, options);
      }

      const { data: publicUrlData } = this.supabase.storage.from(bucket).getPublicUrl(data.path);

      return {
        storagePath: data.path,
        url: publicUrlData.publicUrl,
        fileSize: fileBuffer.length,
        mimeType: options?.contentType || "application/octet-stream",
      };
    } catch (err) {
      console.warn("Storage upload exception, using local fallback:", err);
      return this.localFallback.upload(fileBuffer, fileName, options);
    }
  }

  async delete(storagePath: string): Promise<boolean> {
    if (!this.supabase) return this.localFallback.delete(storagePath);
    try {
      const { error } = await this.supabase.storage.from(this.defaultBucket).remove([storagePath]);
      if (error) return this.localFallback.delete(storagePath);
      return true;
    } catch {
      return this.localFallback.delete(storagePath);
    }
  }

  getPublicUrl(storagePath: string): string {
    if (!this.supabase) return this.localFallback.getPublicUrl(storagePath);
    const { data } = this.supabase.storage.from(this.defaultBucket).getPublicUrl(storagePath);
    return data.publicUrl;
  }

  async getSignedUrl(storagePath: string, expiresInSeconds: number = 3600): Promise<string> {
    if (!this.supabase) return this.localFallback.getSignedUrl(storagePath);
    try {
      const { data, error } = await this.supabase.storage.from(this.defaultBucket).createSignedUrl(storagePath, expiresInSeconds);
      if (error || !data) return this.localFallback.getSignedUrl(storagePath);
      return data.signedUrl;
    } catch {
      return this.localFallback.getSignedUrl(storagePath);
    }
  }

  async exists(storagePath: string): Promise<boolean> {
    if (!this.supabase) return this.localFallback.exists(storagePath);
    try {
      const dir = storagePath.substring(0, storagePath.lastIndexOf("/"));
      const filename = storagePath.substring(storagePath.lastIndexOf("/") + 1);
      const { data } = await this.supabase.storage.from(this.defaultBucket).list(dir, { search: filename });
      return !!(data && data.length > 0);
    } catch {
      return this.localFallback.exists(storagePath);
    }
  }
}
