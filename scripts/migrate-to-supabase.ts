import fs from "fs";
import path from "path";

// Load .env.local if present
const envLocalPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [key, ...values] = trimmed.split("=");
      const val = values.join("=").trim();
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = val;
      }
    }
  });
}

import { getSupabaseAdmin } from "../src/server/db/supabase-admin";
import { SEED_CIRCLES } from "../src/server/db/seed-data";

async function seedSupabase() {
  console.log("==================================================");
  console.log("ORBA: SUPABASE POSTGRESQL SEED & VERIFICATION");
  console.log("==================================================");

  const supabase = getSupabaseAdmin();

  // 1. Create or retrieve primary demo user in Supabase Auth
  const demoUsersToSeed = [
    { email: "hamza@orba.app", password: "password123", username: "hamza", displayName: "Syed Hamza", role: "ADMIN", avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=256&auto=format&fit=crop&q=80", bio: "Founder & Distributed Systems Researcher. Building ORBA to revolutionize technical discourse." },
    { email: "elena@cerebro.ai", password: "password123", username: "elena", displayName: "Dr. Elena Rostova", role: "USER", avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=256&auto=format&fit=crop&q=80", bio: "AI Alignment & Mechanistic Interpretability Researcher at Cerebro AI." },
    { email: "marcus@linearforge.dev", password: "password123", username: "mthorne", displayName: "Marcus Thorne", role: "USER", avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&auto=format&fit=crop&q=80", bio: "Staff Infrastructure Engineer. eBPF, Kernel networking, and ultra-low latency memory buses." },
    { email: "aria@ionquantum.io", password: "password123", username: "ariasterling", displayName: "Aria Sterling", role: "USER", avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=256&auto=format&fit=crop&q=80", bio: "Quantum Algorithm Designer. Error mitigation and topological qubits." },
  ];

  const userIds: Record<string, string> = {};

  for (const du of demoUsersToSeed) {
    let authUser: any = null;
    try {
      const { data: userList } = await supabase.auth.admin.listUsers();
      authUser = userList?.users?.find(u => u.email === du.email);

      if (!authUser) {
        const { data: created, error } = await supabase.auth.admin.createUser({
          email: du.email,
          password: du.password,
          email_confirm: true,
          user_metadata: {
            full_name: du.displayName,
            name: du.displayName,
            avatar_url: du.avatarUrl,
          },
        });

        if (error) {
          console.error(`Could not create auth user ${du.email}:`, error.message);
          continue;
        }
        authUser = created.user;
      }
    } catch (err: any) {
      console.error(`Auth lookup exception for ${du.email}:`, err.message);
      continue;
    }

    if (authUser) {
      userIds[du.username] = authUser.id;

      // Upsert profile
      const { error: profileErr } = await supabase
        .from("profiles")
        .upsert({
          user_id: authUser.id,
          username: du.username,
          display_name: du.displayName,
          avatar_url: du.avatarUrl,
          bio: du.bio,
          role: du.role,
          is_verified: true,
          is_private: false,
          is_suspended: false,
          followers_count: 142,
          following_count: 58,
          posts_count: 12,
        }, { onConflict: "user_id" });

      if (profileErr) {
        console.error(`Profile upsert error for ${du.username}:`, profileErr.message);
      } else {
        console.log(`✅ Synced profile for @${du.username} (${authUser.id})`);
      }

      // Upsert settings
      await supabase.from("user_settings").upsert({
        user_id: authUser.id,
        who_can_message: "EVERYONE",
        who_can_mention: "EVERYONE",
        email_notifications: true,
        in_app_notifications: true,
        theme: "DARK",
      }, { onConflict: "user_id" });
    }
  }

  // 2. Seed Community Circles
  const hamzaId = userIds["hamza"];
  if (hamzaId) {
    for (const c of SEED_CIRCLES) {
      const { data: circleData, error: circleErr } = await supabase
        .from("circles")
        .upsert({
          name: c.name,
          slug: c.slug,
          description: c.description,
          avatar_url: c.avatar_url,
          banner_url: c.banner_url,
          owner_id: hamzaId,
          member_count: c.member_count,
          is_private: c.is_private,
        }, { onConflict: "slug" })
        .select()
        .single();

      if (!circleErr && circleData) {
        console.log(`✅ Synced circle: ${c.name}`);
        // Add owner as member
        await supabase.from("circle_members").upsert({
          circle_id: circleData.id,
          user_id: hamzaId,
          role: "OWNER",
        }, { onConflict: "circle_id,user_id" });
      }
    }

    // 3. Seed Posts / Signals
    const sampleSignals = [
      {
        content: "Announcing ORBA v1.0 — a deterministic, high-signal social architecture for researchers and systems engineers. Built with real-time SSE telemetry, explainable ranking, and cryptographic auditability. #DistributedSystems #ORBA",
        visibility: "PUBLIC",
        like_count: 48,
        comment_count: 12,
        repost_count: 16,
        ranking_score: 95.4,
      },
      {
        content: "Benchmarked our lock-free memory bus with sub-10ms latency across 5,000 concurrent SSE subscribers. The zero-allocation message pipeline performs exceptionally well. #Performance #eBPF",
        visibility: "PUBLIC",
        like_count: 34,
        comment_count: 6,
        repost_count: 8,
        ranking_score: 88.2,
      },
    ];

    for (const s of sampleSignals) {
      const { error: postErr } = await supabase.from("posts").insert({
        author_id: hamzaId,
        content: s.content,
        visibility: s.visibility,
        like_count: s.like_count,
        comment_count: s.comment_count,
        repost_count: s.repost_count,
        ranking_score: s.ranking_score,
      });
      if (!postErr) {
        console.log("✅ Seeded initial signal in PostgreSQL");
      }
    }
  }

  console.log("==================================================");
  console.log("🎉 SUPABASE POSTGRESQL SEED COMPLETE");
  console.log("==================================================");
}

seedSupabase().catch(err => {
  console.error("Seed error:", err);
  process.exit(1);
});
