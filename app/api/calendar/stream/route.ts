import { addSSEClient, removeSSEClient, ensureFanoutSubscriber } from "@/lib/sseBroadcast";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
// Stays on nodejs: the Redis Pub/Sub subscriber that powers cross-instance
// fan-out (see lib/sseBroadcast) needs a TCP socket, which the edge runtime
// can't provide. We instead push maxDuration as high as the platform allows so
// the long-lived stream survives much longer than the ~10s default before the
// client transparently reconnects. (Vercel caps this per plan; 60s is the
// Hobby/fluid-compute max and is valid on every tier.)
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const coupleId = req.nextUrl.searchParams.get("coupleId") || "";
  const clientId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let controllerRef: ReadableStreamDefaultController | null = null;

  // Make sure this instance is subscribed to the Redis fan-out bus before the
  // client starts listening, so writes on other instances reach it.
  ensureFanoutSubscriber();

  const stream = new ReadableStream({
    start(controller) {
      controllerRef = controller;
      addSSEClient(clientId, controller, coupleId);
      const hello = `data: ${JSON.stringify({ type: "connected", clientId })}\n\n`;
      controller.enqueue(new TextEncoder().encode(hello));
    },
    cancel() {
      removeSSEClient(clientId);
    },
  });

  const heartbeat = setInterval(() => {
    try {
      controllerRef?.enqueue(new TextEncoder().encode(`: heartbeat\n\n`));
    } catch {
      clearInterval(heartbeat);
      removeSSEClient(clientId);
    }
  }, 25000);

  req.signal.addEventListener("abort", () => {
    clearInterval(heartbeat);
    removeSSEClient(clientId);
    try { controllerRef?.close(); } catch {}
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
