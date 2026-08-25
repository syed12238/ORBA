import { NextRequest } from "next/server";
import { PostService } from "@/server/services/post.service";
import { CreatePostSchema } from "@/lib/validators";
import { successResponse, errorResponse } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let userId = req.headers.get("x-user-id") || body.userId;

    if (!userId) {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) userId = user.id;
      } catch {}
    }

    if (!userId) {
      return errorResponse("UNAUTHORIZED", "Authentication required to publish a signal.", 401);
    }

    const parsed = CreatePostSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.issues[0].message, 422, parsed.error.issues);
    }

    const post = await PostService.createPost(userId, {
      content: parsed.data.content,
      circleId: parsed.data.circleId,
      visibility: parsed.data.visibility,
      media: parsed.data.media,
    });

    return successResponse(post, 201);
  } catch (err: any) {
    return errorResponse("POST_CREATE_ERROR", err.message || "Failed to create signal", 400);
  }
}
