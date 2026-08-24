export interface UploadOptions {
  bucket?: string;
  folder?: string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  storagePath: string;
  url: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
}

export interface IStorageService {
  upload(fileBuffer: Buffer, fileName: string, options?: UploadOptions): Promise<UploadResult>;
  delete(storagePath: string): Promise<boolean>;
  getPublicUrl(storagePath: string): string;
  getSignedUrl(storagePath: string, expiresInSeconds?: number): Promise<string>;
  exists(storagePath: string): Promise<boolean>;
}
