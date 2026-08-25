import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { IStorageService, UploadOptions, UploadResult } from "./storage.interface";

export class SupabaseStorageProvider implements IStorageService {
  private supabase: SupabaseClient | null = null;
  private defaultBucket: string;
  private bucketChecked: boolean = false;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    this.defaultBucket = process.env.SUPABASE_STORAGE_BUCKET || "orba-media";

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
  }

  private async ensureBucketExists(bucketName: string) {
    if (!this.supabase || this.bucketChecked) return;
    try {
      const { data: buckets } = await this.supabase.storage.listBuckets();
      const exists = (buckets || []).some(b => b.name === bucketName);
      if (!exists) {
        await this.supabase.storage.createBucket(bucketName, { public: true });
      }
      this.bucketChecked = true;
    } catch (err) {
      console.warn("Could not verify/create storage bucket:", err);
    }
  }

  async upload(fileBuffer: Buffer, fileName: string, options?: UploadOptions): Promise<UploadResult> {
    const mimeType = options?.contentType || "image/jpeg";
    const bucket = options?.bucket || this.defaultBucket;
    const folder = options?.folder ? `${options.folder}/` : "";
    const uniqueFileName = `${folder}${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    if (this.supabase) {
      try {
        await this.ensureBucketExists(bucket);

        const { data, error } = await this.supabase.storage
          .from(bucket)
          .upload(uniqueFileName, fileBuffer, {
            contentType: mimeType,
            upsert: true,
          });

        if (!error && data) {
          const { data: publicUrlData } = this.supabase.storage.from(bucket).getPublicUrl(data.path);
          return {
            storagePath: data.path,
            url: publicUrlData.publicUrl,
            fileSize: fileBuffer.length,
            mimeType,
          };
        }

        console.warn(`Supabase storage upload returned error: ${error?.message}`);
      } catch (err) {
        console.warn("Supabase storage upload exception:", err);
      }
    }

    // Safe fallback: Data URL encoding if storage service unavailable
    const base64Data = fileBuffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    return {
      storagePath: uniqueFileName,
      url: dataUrl,
      fileSize: fileBuffer.length,
      mimeType,
    };
  }

  async delete(storagePath: string): Promise<boolean> {
    if (!this.supabase) return true;
    try {
      const { error } = await this.supabase.storage.from(this.defaultBucket).remove([storagePath]);
      return !error;
    } catch {
      return true;
    }
  }

  getPublicUrl(storagePath: string): string {
    if (!this.supabase) return storagePath;
    const { data } = this.supabase.storage.from(this.defaultBucket).getPublicUrl(storagePath);
    return data.publicUrl;
  }

  async getSignedUrl(storagePath: string, expiresInSeconds: number = 3600): Promise<string> {
    if (!this.supabase) return storagePath;
    try {
      const { data, error } = await this.supabase.storage.from(this.defaultBucket).createSignedUrl(storagePath, expiresInSeconds);
      if (error || !data) return this.getPublicUrl(storagePath);
      return data.signedUrl;
    } catch {
      return this.getPublicUrl(storagePath);
    }
  }

  async exists(storagePath: string): Promise<boolean> {
    if (!this.supabase) return true;
    try {
      const dir = storagePath.substring(0, storagePath.lastIndexOf("/"));
      const filename = storagePath.substring(storagePath.lastIndexOf("/") + 1);
      const { data } = await this.supabase.storage.from(this.defaultBucket).list(dir, { search: filename });
      return !!(data && data.length > 0);
    } catch {
      return true;
    }
  }
}
