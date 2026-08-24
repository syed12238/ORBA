import { z } from "zod";

export const CreatePostSchema = z.object({
  content: z.string().max(2000, "Content cannot exceed 2000 characters").optional().default(""),
  circleId: z.string().optional(),
  visibility: z.enum(["PUBLIC", "FOLLOWERS", "PRIVATE"]).optional().default("PUBLIC"),
  media: z.array(z.object({
    url: z.string().min(1, "Media URL is required"),
    storagePath: z.string().optional(),
    mimeType: z.string().optional(),
    fileSize: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
  })).optional(),
});

export const AddCommentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(1000, "Comment cannot exceed 1000 characters"),
  parentId: z.string().optional(),
});

export const CreateCircleSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(50, "Name cannot exceed 50 characters"),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional().default(""),
  avatarUrl: z.string().optional(),
  bannerUrl: z.string().optional(),
  isPrivate: z.boolean().optional().default(false),
});

export const SendMessageSchema = z.object({
  conversationId: z.string().min(1, "Conversation ID required"),
  content: z.string().max(2000, "Message cannot exceed 2000 characters").optional().default(""),
  mediaUrl: z.string().optional(),
});

export const CreateReportSchema = z.object({
  targetType: z.enum(["POST", "USER", "COMMENT"]),
  targetId: z.string().min(1, "Target ID is required"),
  reason: z.string().min(3, "Please provide a reason for the report").max(500),
});

export const UpdateProfileSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  avatar_url: z.string().optional(),
  banner_url: z.string().optional(),
  website: z.string().max(255).optional(),
  location: z.string().max(100).optional(),
  is_private: z.boolean().optional(),
});
