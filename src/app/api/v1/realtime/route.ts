import { NextRequest } from "next/server";
import { realtimeBus } from "@/server/realtime/event-bus";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") || "u_hamza_001";
  const clientId = `${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection handshake
      const initialPayload = JSON.stringify({
        type: "CONNECTED",
        data: { clientId, userId, presences: realtimeBus.getAllPresences() },
        timestamp: new Date().toISOString(),
      });
      controller.enqueue(encoder.encode(`data: ${initialPayload}\n\n`));

      // Register with Realtime Event Bus
      const unregister = realtimeBus.registerClient(clientId, userId, (payload) => {
        try {
          const chunk = `data: ${JSON.stringify(payload)}\n\n`;
          controller.enqueue(encoder.encode(chunk));
        } catch (e) {
          // Stream might be closed
        }
      });

      // Keepalive heartbeat every 20 seconds
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch (e) {
          clearInterval(heartbeat);
        }
      }, 20000);

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unregister();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
