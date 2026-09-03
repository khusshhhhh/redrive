import "server-only";
import Pusher from "pusher";

// Server-side realtime publisher (Pusher Channels REST API — one HTTPS call per
// trigger, no held connection, so it's fine inside serverless functions).
//
// Every call is best-effort: if the transport isn't configured, or Pusher is
// unreachable, we swallow the error. The SSE fallback routes and the periodic
// client polls still deliver the same updates, just less promptly — realtime
// is an enhancement, never the source of truth.

let pusherClient: Pusher | null = null;

function client(): Pusher | null {
  const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } = process.env;
  if (!PUSHER_APP_ID || !PUSHER_KEY || !PUSHER_SECRET || !PUSHER_CLUSTER) return null;
  if (!pusherClient) {
    pusherClient = new Pusher({
      appId: PUSHER_APP_ID,
      key: PUSHER_KEY,
      secret: PUSHER_SECRET,
      cluster: PUSHER_CLUSTER,
      useTLS: true,
    });
  }
  return pusherClient;
}

/** Whether a realtime transport is wired up on the server. */
export function realtimeConfigured(): boolean {
  return client() !== null;
}

/** Publish one event to one channel. Never throws. */
export async function publishRealtime(
  channel: string,
  event: string,
  data: unknown,
): Promise<void> {
  const pusher = client();
  if (!pusher) return;
  try {
    await pusher.trigger(channel, event, data);
  } catch (error) {
    console.error("Realtime publish failed", channel, event, error);
  }
}

/** Publish the same event to several channels at once. Never throws. */
export async function publishRealtimeFanout(
  channels: string[],
  event: string,
  data: unknown,
): Promise<void> {
  const pusher = client();
  if (!pusher) return;
  try {
    // Pusher accepts up to 100 channels per trigger call.
    await pusher.trigger(channels, event, data);
  } catch (error) {
    console.error("Realtime fan-out failed", channels.join(","), event, error);
  }
}
