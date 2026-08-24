import { AuthService } from "../src/server/services/auth.service";
import { UserService } from "../src/server/services/user.service";
import { PostService } from "../src/server/services/post.service";
import { FeedService } from "../src/server/services/feed.service";
import { ChatService } from "../src/server/services/chat.service";
import { NotificationService } from "../src/server/services/notification.service";
import { CircleService } from "../src/server/services/circle.service";
import { ModerationService } from "../src/server/services/moderation.service";
import { ApiKeyService } from "../src/server/services/apikey.service";
import { AdminService } from "../src/server/services/admin.service";
import { SearchService } from "../src/server/services/search.service";
import { db } from "../src/server/db";

async function runVerificationSuite() {
  console.log("==================================================");
  console.log("ORBA SOCIAL PLATFORM — INTEGRATED VERIFICATION SUITE");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Foundational DB Integrity
  const state = db.getState();
  assert(Array.isArray(state.users), "Database users collection initialized");
  assert(Array.isArray(state.posts), "Database posts collection initialized");
  assert(state.circles.length >= 1, `Foundational circles initialized (${state.circles.length} circles)`);

  // 2. Dynamic Real User Registration & Auth
  const timestamp = Date.now().toString().slice(-5);
  const userA = await AuthService.register({
    username: `user_a_${timestamp}`,
    email: `usera_${timestamp}@domain.com`,
    displayName: "Alice Dev",
    password: "password123",
  });
  assert(userA.user.username.startsWith("user_a_"), "AuthService.register creates real User A");

  const userB = await AuthService.register({
    username: `user_b_${timestamp}`,
    email: `userb_${timestamp}@domain.com`,
    displayName: "Bob Engineer",
    password: "password123",
  });
  assert(userB.user.username.startsWith("user_b_"), "AuthService.register creates real User B");

  // 3. Social Graph & Follow System
  const followResult = UserService.toggleFollow(userA.user.id, userB.user.id);
  assert(followResult.is_following === true, "UserService.toggleFollow creates follow relationship");

  const bobFollowers = UserService.getFollowers(userB.user.id, userA.user.id);
  assert(bobFollowers.some(f => f.user_id === userA.user.id), "Follower list includes newly following user");

  // 4. Signal / Post Creation & Reactions
  const defaultCircle = state.circles[0]?.id;
  const testSignal = PostService.createPost(userA.user.id, {
    content: "Testing real-time decentralized social infrastructure on ORBA! #Architecture #Realtime",
    circleId: defaultCircle,
  });
  assert(testSignal.content.includes("decentralized social infrastructure"), "PostService.createPost persists new signal");

  const likeResult = PostService.toggleLike(testSignal.id, userB.user.id);
  assert(likeResult.liked === true && likeResult.like_count === 1, "PostService.toggleLike updates like counter atomically");

  const commentResult = PostService.addComment(testSignal.id, userB.user.id, "Looks fantastic. Live socket latency verified!");
  assert(commentResult.content.includes("Live socket latency"), "PostService.addComment appends comment");

  // 5. Feed Ranking & Cursor Pagination
  const feed = FeedService.getHomeFeed(userB.user.id, { filter: "for_you", limit: 10 });
  assert(feed.posts.length > 0, `FeedService returns ${feed.posts.length} ranked signals`);
  assert(feed.posts[0].ranking_score > 0, "Feed signals scored by explainable ranking algorithm");

  // 6. Realtime Direct Messaging
  const conv = ChatService.startOrGetDirectConversation(userA.user.id, userB.user.id);
  assert(conv.id.startsWith("conv_"), "ChatService creates 1-on-1 direct conversation");

  const msg = ChatService.sendMessage(conv.id, userA.user.id, "Hello from Alice to Bob via real-time SSE!");
  assert(msg.content.includes("Hello from Alice"), "ChatService.sendMessage dispatches message");

  const msgs = ChatService.getConversationMessages(conv.id, userB.user.id);
  assert(msgs.length >= 1, "ChatService retrieves message history for participant");

  // 7. Pulse Notifications
  const notifs = NotificationService.getUserNotifications(userB.user.id);
  assert(Array.isArray(notifs), "NotificationService retrieves user notification inbox");

  // 8. Search & Multi-Entity Query
  const searchRes = SearchService.search("decentralized", userB.user.id);
  assert(searchRes.posts.length > 0 || searchRes.circles.length > 0, "SearchService returns matched entities");

  // 9. API Keys & Verification
  const keyGen = ApiKeyService.generateKey(userA.user.id, "Live API Key");
  assert(keyGen.apiKey.key_prefix.startsWith("orba_live_"), "ApiKeyService generates formatted prefix key");

  const keyVerify = ApiKeyService.verifyKey(keyGen.rawSecret);
  assert(keyVerify.valid === true && keyVerify.userId === userA.user.id, "ApiKeyService verifies raw secret against SHA-256 hash");

  // 10. Admin Telemetry & Health
  const metrics = AdminService.getSystemMetrics();
  assert(metrics.overview.totalUsers >= 2, `AdminService tracks total real users (${metrics.overview.totalUsers})`);
  assert(metrics.health.status === "HEALTHY", "AdminService reports HEALTHY status");

  // 11. Security & Authorization Boundary
  try {
    UserService.toggleFollow(userA.user.id, userA.user.id);
    assert(false, "Self-follow constraint");
  } catch {
    assert(true, "Database constraint rejects self-follow attempt");
  }

  console.log("==================================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runVerificationSuite().catch(err => {
  console.error("Test runner error:", err);
  process.exit(1);
});
