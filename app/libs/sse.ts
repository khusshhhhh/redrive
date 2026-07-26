// Minimal Server-Sent Events helper. Each stream repeatedly calls `poll()`
// on an interval and emits whatever events it returns, sends a heartbeat
// comment so intermediary proxies/load balancers don't time the connection
// out early, and force-closes itself after `maxDurationMs` — the browser's
// native EventSource reconnects automatically, so a short-lived stream that
// reconnects is simpler and more resilient on serverless than trying to
// keep one connection alive indefinitely.

export interface SSEEvent {
  event?: string;
  data: unknown;
  id?: string;
}

interface CreateSSEStreamOptions {
  poll: () => Promise<SSEEvent[]>;
  intervalMs?: number;
  heartbeatMs?: number;
  maxDurationMs?: number;
}

function encodeEvent({ event, data, id }: SSEEvent): string {
  let out = "";
  if (id) out += `id: ${id}\n`;
  if (event) out += `event: ${event}\n`;
  out += `data: ${JSON.stringify(data)}\n\n`;
  return out;
}

export function createSSEStream({
  poll,
  intervalMs = 1000,
  heartbeatMs = 15000,
  maxDurationMs = 45000,
}: CreateSSEStreamOptions): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let stopped = false;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const startedAt = Date.now();
      let lastHeartbeat = Date.now();

      while (!stopped && Date.now() - startedAt < maxDurationMs) {
        try {
          const events = await poll();
          if (stopped) break;
          for (const evt of events) {
            controller.enqueue(encoder.encode(encodeEvent(evt)));
          }
        } catch (error) {
          if (!stopped) console.error("SSE poll error:", error);
        }

        if (stopped) break;

        if (Date.now() - lastHeartbeat > heartbeatMs) {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
          lastHeartbeat = Date.now();
        }

        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }

      try {
        controller.close();
      } catch {
        // already closed
      }
    },
    cancel() {
      // Fired when the client disconnects — stop polling immediately.
      stopped = true;
    },
  });
}

export function sseResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
