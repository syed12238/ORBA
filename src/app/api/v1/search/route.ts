import { NextRequest } from "next/server";
import { SearchService } from "@/server/services/search.service";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const query = req.nextUrl.searchParams.get("q") || "";
    const currentUserId = req.headers.get("x-user-id") || req.nextUrl.searchParams.get("userId") || undefined;
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20", 10);

    const results = await SearchService.search(query, currentUserId, limit);
    return successResponse(results);
  } catch (err: any) {
    return errorResponse("SEARCH_ERROR", err.message, 500);
  }
}
