import { NextRequest } from "next/server";
import { ApiKeyService } from "@/server/services/apikey.service";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id") || req.nextUrl.searchParams.get("userId");
    if (!userId) return errorResponse("UNAUTHORIZED", "Authentication required", 401);

    const keys = ApiKeyService.getUserKeys(userId);
    return successResponse({ keys });
  } catch (err: any) {
    return errorResponse("API_KEYS_FETCH_ERROR", err.message, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return errorResponse("UNAUTHORIZED", "Authentication required", 401);

    const body = await req.json();
    const name = body.name || "Default Developer Key";

    const result = ApiKeyService.generateKey(userId, name);
    return successResponse(result, 201);
  } catch (err: any) {
    return errorResponse("API_KEY_CREATE_ERROR", err.message, 400);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return errorResponse("UNAUTHORIZED", "Authentication required", 401);

    const keyId = req.nextUrl.searchParams.get("keyId");
    if (!keyId) return errorResponse("BAD_REQUEST", "keyId query parameter required", 400);

    ApiKeyService.revokeKey(keyId, userId);
    return successResponse({ revoked: true, keyId });
  } catch (err: any) {
    return errorResponse("API_KEY_REVOKE_ERROR", err.message, 400);
  }
}
