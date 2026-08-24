import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AuthService } from "@/server/services/auth.service";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/";

  if (code) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("OAuth exchange error:", error.message);
        return NextResponse.redirect(`${requestUrl.origin}/login?error=${encodeURIComponent(error.message)}`);
      }

      if (data?.user) {
        // Auto-provision or safely link ORBA profile
        await AuthService.syncSupabaseUser({
          supabaseId: data.user.id,
          email: data.user.email || "",
          displayName: data.user.user_metadata?.full_name || data.user.user_metadata?.name,
          avatarUrl: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture,
        });
      }

      return NextResponse.redirect(`${requestUrl.origin}${next}`);
    } catch (err: any) {
      console.error("Auth callback exception:", err);
      return NextResponse.redirect(`${requestUrl.origin}/login?error=Authentication%20failed`);
    }
  }

  // No code provided or error param in callback
  const errorDescription = requestUrl.searchParams.get("error_description");
  if (errorDescription) {
    return NextResponse.redirect(`${requestUrl.origin}/login?error=${encodeURIComponent(errorDescription)}`);
  }

  return NextResponse.redirect(`${requestUrl.origin}/login`);
}
