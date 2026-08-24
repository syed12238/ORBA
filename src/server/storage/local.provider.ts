import fs from "fs";
import path from "path";
import { IStorageService, UploadOptions, UploadResult } from "./storage.interface";

export class LocalStorageProvider implements IStorageService {
  private uploadsDir: string;

  constructor() {
    this.uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async upload(fileBuffer: Buffer, fileName: string, options?: UploadOptions): Promise<UploadResult> {
    const timestamp = Date.now();
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFileName = `${timestamp}_${sanitizedName}`;
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
      mimeType: options?.contentType || "application/octet-stream",
    };
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
    } catch (err) {
      console.error("Local storage delete error:", err);
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
