import { addSSEClient, removeSSEClient } from "@/lib/sseBroadcast";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const clientId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let controllerRef: ReadableStreamDefaultController | null = null;

  const stream = new ReadableStream({
    start(controller) {
      controllerRef = controller;
      addSSEClient(clientId, controller);
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

