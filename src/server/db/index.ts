import fs from "fs";
import path from "path";
import { 
  User, Profile, Post, Media, Comment, Circle, Notification, 
  Conversation, Message, Report, AIModerationLog, ApiKey, AuditLog, UserSettings 
} from "@/types";

export interface DatabaseState {
  users: User[];
  profiles: Profile[];
  follows: { id: string; follower_id: string; following_id: string; created_at: string }[];
  follow_requests: { id: string; sender_id: string; recipient_id: string; status: "PENDING" | "ACCEPTED" | "REJECTED"; created_at: string }[];
  posts: Post[];
  media: Media[];
  post_likes: { id: string; post_id: string; user_id: string; created_at: string }[];
  comments: Comment[];
  comment_likes: { id: string; comment_id: string; user_id: string; created_at: string }[];
  reposts: { id: string; post_id: string; user_id: string; quote_content?: string; created_at: string }[];
  bookmarks: { id: string; post_id: string; user_id: string; created_at: string }[];
  notifications: Notification[];
  conversations: { id: string; is_group: boolean; name?: string; last_message_at: string; created_at: string }[];
  conversation_members: { id: string; conversation_id: string; user_id: string; last_read_at: string; joined_at: string }[];
  messages: Message[];
  circles: Circle[];
  circle_members: { id: string; circle_id: string; user_id: string; role: "OWNER" | "MODERATOR" | "MEMBER"; joined_at: string }[];
  reports: Report[];
  ai_moderation_logs: AIModerationLog[];
  api_keys: ApiKey[];
  audit_logs: AuditLog[];
  user_settings: UserSettings[];
}

const DB_DIR = path.join(process.cwd(), ".orba");
const DB_FILE = path.join(DB_DIR, "storage.json");

class DatabaseEngine {
  private state: DatabaseState | null = null;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.init();
  }

  private init() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, "utf-8");
        this.state = JSON.parse(raw);
        return;
      } catch (err) {
        console.error("Failed to load existing database file, re-initializing:", err);
      }
    }

    this.state = this.buildSeedDatabase();
    this.persistSync();
  }

  private persistSync() {
    if (!this.state) return;
    try {
      const tempPath = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(this.state, null, 2), "utf-8");
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error("Failed to persist database state:", err);
    }
  }

  public save() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.persistSync();
    }, 50);
  }

  public getState(): DatabaseState {
    if (!this.state) {
      this.init();
    }
    return this.state!;
  }

  public resetToSeed(): DatabaseState {
    this.state = this.buildSeedDatabase();
    this.persistSync();
    return this.state;
  }

  private buildSeedDatabase(): DatabaseState {
    const now = new Date().toISOString();

    const initialCircles: Circle[] = [
      {
        id: "c_general",
        name: "General Orbit",
        slug: "general",
        description: "The primary gathering hub for general thoughts, introductions, and cross-discipline discussions on ORBA.",
        avatar_url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=256&auto=format&fit=crop&q=80",
        banner_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80",
        owner_id: "system",
        member_count: 0,
        is_private: false,
        created_at: now,
        updated_at: now,
      },
      {
        id: "c_tech_engineering",
        name: "Tech & Engineering",
        slug: "tech-engineering",
        description: "Discussions on software architecture, systems engineering, web technology, and distributed algorithms.",
        avatar_url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=256&auto=format&fit=crop&q=80",
        banner_url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&auto=format&fit=crop&q=80",
        owner_id: "system",
        member_count: 0,
        is_private: false,
        created_at: now,
        updated_at: now,
      },
      {
        id: "c_design_creative",
        name: "Design & Creative",
        slug: "design-creative",
        description: "UI/UX, visual art, typography, creative coding, and modern product design paradigms.",
        avatar_url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=256&auto=format&fit=crop&q=80",
        banner_url: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=1200&auto=format&fit=crop&q=80",
        owner_id: "system",
        member_count: 0,
        is_private: false,
        created_at: now,
        updated_at: now,
      },
      {
        id: "c_ai_research",
        name: "AI & Innovation",
        slug: "ai-innovation",
        description: "Exploring machine learning, multimodal models, autonomous agents, and technological frontiers.",
        avatar_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=256&auto=format&fit=crop&q=80",
        banner_url: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200&auto=format&fit=crop&q=80",
        owner_id: "system",
        member_count: 0,
        is_private: false,
        created_at: now,
        updated_at: now,
      },
    ];

    return {
      users: [],
      profiles: [],
      follows: [],
      follow_requests: [],
      posts: [],
      media: [],
      post_likes: [],
      comments: [],
      comment_likes: [],
      reposts: [],
      bookmarks: [],
      notifications: [],
      conversations: [],
      conversation_members: [],
      messages: [],
      circles: initialCircles,
      circle_members: [],
      reports: [],
      ai_moderation_logs: [],
      api_keys: [],
      audit_logs: [],
      user_settings: [],
    };
  }
}

const globalForDb = global as unknown as { orbaDbEngine?: DatabaseEngine };
export const db = globalForDb.orbaDbEngine || new DatabaseEngine();
if (process.env.NODE_ENV !== "production") globalForDb.orbaDbEngine = db;
