import fs from "fs";
import path from "path";
import { IStorageService, UploadOptions, UploadResult } from "./storage.interface";

export class LocalStorageProvider implements IStorageService {
  private uploadsDir: string;

  constructor() {
    this.uploadsDir = path.join(process.cwd(), "public", "uploads");
    try {
      if (!fs.existsSync(this.uploadsDir)) {
        fs.mkdirSync(this.uploadsDir, { recursive: true });
      }
    } catch {
      // Ignored in read-only environments like Vercel
    }
  }

  async upload(fileBuffer: Buffer, fileName: string, options?: UploadOptions): Promise<UploadResult> {
    const mimeType = options?.contentType || "image/jpeg";
    const timestamp = Date.now();
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFileName = `${timestamp}_${sanitizedName}`;

    try {
      const targetFolder = options?.folder ? path.join(this.uploadsDir, options.folder) : this.uploadsDir;

      if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder, { recursive: true });
      }

      const filePath = path.join(targetFolder, uniqueFileName);
      fs.writeFileSync(filePath, fileBuffer);

      const relativePath = options?.folder ? `/uploads/${options.folder}/${uniqueFileName}` : `/uploads/${uniqueFileName}`;

      return {
        storagePath: relativePath,
        url: relativePath,
        fileSize: fileBuffer.length,
        mimeType,
      };
    } catch {
      // Fallback to Data URL in read-only environment
      const base64Data = fileBuffer.toString("base64");
      return {
        storagePath: uniqueFileName,
        url: `data:${mimeType};base64,${base64Data}`,
        fileSize: fileBuffer.length,
        mimeType,
      };
    }
  }

  async delete(storagePath: string): Promise<boolean> {
    try {
      const cleanPath = storagePath.startsWith("/uploads/") ? storagePath.replace("/uploads/", "") : storagePath;
      const fullPath = path.join(this.uploadsDir, cleanPath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  getPublicUrl(storagePath: string): string {
    return storagePath;
  }

  async getSignedUrl(storagePath: string): Promise<string> {
    return storagePath;
  }

  async exists(storagePath: string): Promise<boolean> {
    const cleanPath = storagePath.startsWith("/uploads/") ? storagePath.replace("/uploads/", "") : storagePath;
    const fullPath = path.join(this.uploadsDir, cleanPath);
    return fs.existsSync(fullPath);
  }
}
