# ORBA System Architecture Document
**Tagline**: Where conversations orbit people.
**Version**: 1.0 (Production Hardened)

---

## 1. System Topology & Data Flow

$$\text{Client (Browser)} \longleftrightarrow \text{Next.js 14 App Router (SSR / Edge)} \longleftrightarrow \text{Supabase Auth} \longleftrightarrow \text{PostgreSQL 15 (RLS)}$$

```
+---------------------------------------------------------------------------------------------------+
|                                        ORBA FRONTEND LAYER                                        |
|  - React 18 / Next.js 14 App Router                                                              |
|  - TailwindCSS + Custom Obsidian Design Tokens                                                   |
|  - @supabase/ssr Browser Client (createBrowserClient)                                            |
|  - AuthContext (Single Source of Truth: Supabase Session)                                         |
+---------------------------------------------------------------------------------------------------+
                                                  │
                         HTTPS Request / Cookie Session
                                                  ▼
+---------------------------------------------------------------------------------------------------+
|                                   NEXT.JS 14 APPLICATION SERVER                                   |
|  - Edge Middleware (src/middleware.ts): Session Refresh & Cookie Propagation                      |
|  - API Routes (/api/v1/*): Validated Typed REST Endpoints                                         |
|  - Server Supabase Client (src/lib/supabase/server.ts): Cookie-backed Server Client               |
|  - Service Layer (UserService, PostService, FeedService, ChatService, NotificationService, etc.)   |
+---------------------------------------------------------------------------------------------------+
                                                  │
                      PostgreSQL Connection / Supabase Auth JWT
                                                  ▼
+---------------------------------------------------------------------------------------------------+
|                                    SUPABASE PRODUCTION BACKEND                                    |
|  1. SUPABASE AUTH:                                                                                |
|     - Google OAuth Web Client                                                                     |
|     - auth.users Identity Authority                                                              |
|     - JWT Minting & Session Token Lifecycles                                                      |
|                                                                                                   |
|  2. POSTGRESQL 15 DATABASE (public schema):                                                       |
|     - 21 Tables (profiles, follows, circles, posts, comments, likes, messages, notifications...)  |
|     - Row Level Security (RLS) enabled on ALL 21 tables                                           |
|     - Relational Foreign Keys (profiles.user_id REFERENCES auth.users.id ON DELETE CASCADE)       |
|     - B-Tree Performance Indexes for high-frequency feeds & messaging                             |
|                                                                                                   |
|  3. SUPABASE STORAGE (Upcoming Phase 4):                                                          |
|     - orba-media bucket with presigned URLs                                                       |
|                                                                                                   |
|  4. REALTIME ENGINE (Upcoming Phase 5):                                                           |
|     - Postgres CDC WebSocket streaming for pulse notifications & live chat                        |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Layer Responsibilities & Execution Contexts

### A. Client-Side (Browser)
- **Execution Context**: User's browser.
- **Client**: `createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)`
- **Permissions**: Public anon key only. Operates under the authenticated user's JWT permissions subject to Row Level Security.
- **Components**: UI primitives, feed rendering, composer modals, interactive persona switching for local simulations, client navigation.

### B. Server-Side (Next.js SSR & API Route Handlers)
- **Execution Context**: Next.js Node.js / Edge runtime (`src/app/api/v1/*`, `src/middleware.ts`, Server Actions).
- **Client**: `createServerClient` reading and setting auth cookies via Next.js `cookies()`.
- **Identity Resolution**: `supabase.auth.getUser()` verifies JWT cryptographically against Supabase Auth.
- **Services**:
  - `UserService`: Profile updates, follow/unfollow graph operations, privacy preferences.
  - `PostService`: Signal creation, atomic like counters, comment tree threading, bookmark persistence.
  - `FeedService`: Dynamic explainable ranking ($Recency + Engagement + Relationship$), cursor pagination.
  - `ChatService`: Direct messaging, conversation isolation, participant memberships.
  - `NotificationService`: In-app pulse notification dispatch and inbox tracking.
  - `CircleService`: Research community circles and membership management.
  - `SearchService`: Multi-entity search across signals, profiles, circles, and hashtags.
  - `ApiKeyService`: SHA-256 hashed developer API key provisioning and authentication.
  - `AdminService` & `ModerationService`: System health telemetry, AI moderation logs, report queues.

### C. Database-Side (Supabase PostgreSQL + RLS)
- **Execution Context**: PostgreSQL 15 database engine.
- **Row Level Security**:
  - `profiles`: Public read for active users; updates restricted to `auth.uid() = user_id`.
  - `posts`: Visibility checks (`PUBLIC`, `FOLLOWERS`, `PRIVATE`); mutations restricted to `auth.uid() = author_id`.
  - `bookmarks`: Isolated strictly to owner (`auth.uid() = user_id`).
  - `conversations` & `messages`: Enforced per-conversation membership; non-participants cannot read or dispatch messages.
  - `notifications`: Isolated strictly to recipient (`auth.uid() = recipient_id`).
  - `user_settings` & `api_keys`: Isolated strictly to owner (`auth.uid() = user_id`).
  - `reports`: User submit; `ADMIN` triage only.

---

## 3. Environment Variable Security Matrix

| Variable Name | Scope | Sensitivity | Purpose |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public / Browser | `PUBLIC` | Canonical Supabase project API gateway |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public / Browser | `PUBLIC` | Anon public key for SSR & client queries |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-Only | `SERVER-ONLY SECRET` | Backend administrative operations |
| `GOOGLE_CLIENT_SECRET` | Server-Only (Supabase) | `SECRET` | Google OAuth secret (held in Supabase Dashboard) |
| `DATABASE_PASSWORD` | Server-Only (Supabase) | `SECRET` | PostgreSQL master password |

---

## 4. Development Fixtures vs Production Data

- **Production Runtime**: All production data resides in Supabase PostgreSQL (`auth.users`, `public.profiles`, `public.posts`, etc.).
- **Development Seed Fixtures (`.orba/storage.json`)**: Preserved strictly as an offline/development seed fixture for standalone tests, mock persona switching, and unit verification. Never accessed in production environments.
