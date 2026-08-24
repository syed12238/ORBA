export type UserRole = "USER" | "MODERATOR" | "ADMIN";
export type Visibility = "PUBLIC" | "FOLLOWERS" | "PRIVATE";
export type NotificationType = "LIKE" | "COMMENT" | "REPLY" | "FOLLOW" | "REPOST" | "MESSAGE" | "MENTION";
export type ReportStatus = "OPEN" | "REVIEWING" | "RESOLVED" | "REJECTED";
export type ReportTargetType = "POST" | "USER" | "COMMENT";
export type AIModerationClassification = "SAFE" | "REVIEW" | "BLOCK";
export type CircleRole = "OWNER" | "MODERATOR" | "MEMBER";
export type FollowRequestStatus = "PENDING" | "ACCEPTED" | "REJECTED";
export type UserPresence = "ONLINE" | "AWAY" | "OFFLINE";
export type FeedFilter = "for_you" | "following" | "trending" | "media" | "bookmarks";

export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  is_verified: boolean;
  is_private: boolean;
  is_suspended: boolean;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface Profile {
  user_id: string;
  display_name: string;
  avatar_url: string;
  banner_url?: string;
  bio?: string;
  website?: string;
  location?: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
  created_at: string;
  updated_at: string;
  is_following?: boolean;
  has_pending_follow_request?: boolean;
}

export interface UserProfileFull extends Profile {
  username: string;
  is_verified: boolean;
  is_private: boolean;
  role?: UserRole;
}

export interface Media {
  id: string;
  post_id?: string;
  storage_path: string;
  url: string;
  thumbnail_url?: string;
  mime_type: string;
  file_size: number;
  width?: number;
  height?: number;
  duration?: number;
  created_at: string;
}

export interface Post {
  id: string;
  author_id: string;
  circle_id?: string;
  content: string;
  visibility: Visibility;
  like_count: number;
  comment_count: number;
  repost_count: number;
  bookmark_count: number;
  ranking_score: number;
  is_moderated: boolean;
  created_at: string;
  updated_at: string;
  author?: Profile & { username: string; is_verified: boolean; role: UserRole };
  circle?: Circle;
  media?: Media[];
  has_liked?: boolean;
  has_reposted?: boolean;
  has_bookmarked?: boolean;
  repost_author?: Profile & { username: string };
  quote_content?: string;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  parent_id?: string | null;
  content: string;
  like_count: number;
  created_at: string;
  updated_at: string;
  author?: Profile & { username: string; is_verified: boolean };
  has_liked?: boolean;
  replies?: Comment[];
}

export interface Circle {
  id: string;
  name: string;
  slug: string;
  description?: string;
  avatar_url?: string;
  banner_url?: string;
  owner_id: string;
  member_count: number;
  is_private: boolean;
  created_at: string;
  updated_at: string;
  is_member?: boolean;
  user_role?: CircleRole;
  owner?: Profile & { username: string };
}

export interface Notification {
  id: string;
  recipient_id: string;
  actor_id: string;
  type: NotificationType;
  post_id?: string;
  comment_id?: string;
  read: boolean;
  created_at: string;
  actor?: Profile & { username: string; is_verified: boolean };
  post?: { id: string; content: string };
}

export interface Conversation {
  id: string;
  is_group: boolean;
  name?: string;
  last_message_at: string;
  created_at: string;
  members: (Profile & { username: string; user_id: string })[];
  last_message?: Message;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  media_url?: string;
  read_at?: string | null;
  created_at: string;
  sender?: Profile & { username: string };
}

export interface Report {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  status: ReportStatus;
  notes?: string;
  resolved_by?: string;
  created_at: string;
  updated_at: string;
  reporter?: Profile & { username: string };
  target_preview?: string;
  ai_evaluation?: AIModerationLog;
}

export interface AIModerationLog {
  id: string;
  target_type: string;
  target_id: string;
  classification: AIModerationClassification;
  confidence: number;
  reasoning: {
    categories: string[];
    sentiment?: string;
    risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    explanation: string;
  };
  created_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  status: "ACTIVE" | "REVOKED";
  last_used_at?: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  metadata?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
  actor?: Profile & { username: string };
}

export interface UserSettings {
  user_id: string;
  who_can_message: "EVERYONE" | "FOLLOWING" | "NOBODY";
  who_can_mention: "EVERYONE" | "FOLLOWING" | "NOBODY";
  email_notifications: boolean;
  in_app_notifications: boolean;
  theme: "DARK" | "LIGHT" | "SYSTEM";
}

export interface HashtagTrend {
  tag: string;
  count: number;
  category: string;
}

export interface SearchResults {
  posts: Post[];
  users: (Profile & { username: string; is_verified: boolean; is_following?: boolean })[];
  circles: Circle[];
  hashtags: HashtagTrend[];
}

export interface AdminMetrics {
  overview: {
    totalUsers: number;
    totalPosts: number;
    totalComments: number;
    totalCircles: number;
    totalReports: number;
    activeRealtimeConnections: number;
  };
  queue: {
    jobsProcessed: number;
    avgLatencyMs: number;
  };
  health: {
    status: string;
    memoryUsageMb: number;
  };
  storage: {
    mediaCount: number;
    provider: string;
  };
}

export interface ApiResponse<T = unknown> {
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  } | null;
}

export interface PaginatedFeedResponse {
  posts: Post[];
  nextCursor?: string | null;
  hasMore: boolean;
  totalCount?: number;
}
