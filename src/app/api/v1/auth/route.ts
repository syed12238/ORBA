import { NextRequest } from "next/server";
import { AuthService } from "@/server/services/auth.service";
import { successResponse, errorResponse } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (userId) {
      const user = AuthService.getUserById(userId);
      if (!user) return errorResponse("USER_NOT_FOUND", "User not found", 404);
      return successResponse(user);
    }

    // Try checking active Supabase session
    try {
      const supabase = createClient();
      const { data: { user: sbUser } } = await supabase.auth.getUser();
      if (sbUser) {
        const synced = await AuthService.syncSupabaseUser({
          supabaseId: sbUser.id,
          email: sbUser.email || "",
          displayName: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name,
          avatarUrl: sbUser.user_metadata?.avatar_url || sbUser.user_metadata?.picture,
        });
        return successResponse(synced);
      }
    } catch {
      // ignore if unauthenticated or cookie missing
    }

    return successResponse({ authenticated: false });
  } catch (err: any) {
    return errorResponse("AUTH_ERROR", err.message || "Failed to fetch auth data", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || "login";

    if (action === "sync_supabase") {
      const { supabaseId, email, displayName, avatarUrl } = body;
      if (!supabaseId || !email) {
        return errorResponse("INVALID_PAYLOAD", "Missing supabaseId or email", 400);
      }
      const result = await AuthService.syncSupabaseUser({
        supabaseId,
        email,
        displayName,
        avatarUrl,
      });
      return successResponse(result);
    }

    if (action === "register") {
      const result = await AuthService.register({
        username: body.username,
        email: body.email,
        displayName: body.displayName,
        password: body.password,
        avatarUrl: body.avatarUrl,
        bio: body.bio,
      });
      return successResponse(result, 201);
    }

    // Default: Login
    const result = await AuthService.login(body.emailOrUsername || body.email, body.password);
    return successResponse(result);
  } catch (err: any) {
    return errorResponse("AUTH_FAILED", err.message || "Authentication error", 400);
  }
}
