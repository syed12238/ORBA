import { NextRequest } from "next/server";
import { storageService } from "@/server/storage";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return errorResponse("UNAUTHORIZED", "Authentication required to upload media", 401);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return errorResponse("BAD_REQUEST", "No file uploaded in form data", 400);
    }

    // MIME type check
    const allowedMimeTypes = [
      "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml", "video/mp4", "video/webm"
    ];
    if (!allowedMimeTypes.includes(file.type)) {
      return errorResponse("INVALID_FILE_TYPE", `File type ${file.type} is not supported. Supported: JPEG, PNG, WEBP, GIF, MP4.`, 400);
    }

    // Size limit check (50MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return errorResponse("FILE_TOO_LARGE", "File exceeds the 50MB limit.", 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await storageService.upload(buffer, file.name, {
      contentType: file.type,
      folder: "signals",
    });

    return successResponse({
      url: result.url,
      storagePath: result.storagePath,
      mimeType: result.mimeType,
      fileSize: result.fileSize,
      width: 1200,
      height: 800,
    }, 201);
  } catch (err: any) {
    return errorResponse("UPLOAD_ERROR", err.message || "Failed to process media upload", 500);
  }
}
