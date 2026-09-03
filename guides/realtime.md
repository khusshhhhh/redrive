# Realtime updates (chat, typing, read receipts, notifications)

Redrive delivers live updates over one of two transports, chosen by
environment variable:

| | Transport | When |
|---|---|---|
| Default | **SSE polling** (`/api/chats/**/stream`) | `NEXT_PUBLIC_REALTIME_ENABLED` unset |
| Preferred | **Pusher Channels** (WebSocket) | `NEXT_PUBLIC_REALTIME_ENABLED=1` + Pusher keys |

The SSE routes and the periodic client polls are always left in place. Realtime
is an enhancement layered on top — if Pusher is not configured, or the browser
can't reach it, the client falls back to SSE automatically and nothing is lost
except a second or two of latency.

## Why Pusher

- **Free tier is enough to start**: 200k messages/day, 100 max concurrent
  connections, unlimited channels, 100 SSL connections. No card required.
- `pusher-js` bundles cleanly with the Next.js webpack build (Ably's bundle
  currently does not) and is code-split so it never ships to visitors who don't
  open a realtime surface.
- The server publishes over the REST API (one HTTPS call per event, no held
  connection), which is exactly what serverless functions want.

### Cost ceiling and when to upgrade

The free plan's real limit is **100 concurrent connections** — i.e. 100 people
with a Redrive tab open at the same moment (not 100 users total). Watch the
*Concurrent connections* graph in the Pusher dashboard.

- Approaching ~80 sustained → move to Pusher **Startup** (~US$49/mo, 500
  connections, 1M messages/day) or reassess.
- If connection cost becomes the bottleneck, the abstraction in
  `app/libs/realtime/` and `app/hooks/useRealtime.ts` is deliberately small:
  swapping to Ably (200 free connections), Supabase Realtime, or a self-hosted
  WebSocket only touches `publish.ts`, `useRealtime.ts`, and the auth route.

Message volume is not the concern at Redrive's scale: a busy day of chatting is
tens of thousands of messages, well under the 200k/day cap.

## Setup

1. Create a free account at <https://pusher.com> → **Channels** → create an app.
   Pick a cluster close to your users — `ap4` is Sydney.
2. From the app's **App Keys** tab, set these environment variables (see
   `guides/ENVIRONMENT_VARIABLES_GUIDE.md` for where each one lives):

   ```dotenv
   NEXT_PUBLIC_REALTIME_ENABLED="1"
   NEXT_PUBLIC_PUSHER_KEY="<key>"
   NEXT_PUBLIC_PUSHER_CLUSTER="ap4"
   PUSHER_APP_ID="<app_id>"
   PUSHER_KEY="<key>"
   PUSHER_SECRET="<secret>"
   PUSHER_CLUSTER="ap4"
   ```

   `NEXT_PUBLIC_*` values are embedded in the browser bundle — that's expected;
   the key alone can't publish or read a private channel. `PUSHER_SECRET` is a
   real secret and must stay server-only.
3. In the Pusher app settings, enable **"Authorized connections"** is not
   required, but do leave client events **off** — Redrive never uses them.
4. Redeploy. All seven vars must be present together; setting only some leaves
   the client trying Pusher and failing over to SSE on every load.

## How it works

### Channels

- `private-user-<userId>` — inbox row changes, notification badge bumps, and
  read receipts on the viewer's own messages.
- `private-chat-<chatId>` — new messages, typing, read receipts for one
  conversation.

Every subscription is a **private channel**, so the browser must be authorized
by `POST /api/realtime/auth` first. That route checks the NextAuth session and
signs the subscription only if the user owns the `user:` channel or is a
participant of the `chat:`. Clients can only ever *subscribe* — all publishing
is server-side with `PUSHER_SECRET`, so a signed subscription cannot be used to
inject a message or read a stranger's conversation.

### Publish points (server)

| Event | Fired from | Channels |
|---|---|---|
| `message` | `POST /api/chats/[chatId]/messages` | `private-chat-<id>` |
| `chat-update` | same | each participant's `private-user-<id>` |
| `typing` | `POST /api/chats/[chatId]/typing` | `private-chat-<id>` |
| `read` | `POST /api/chats/[chatId]/read` | `private-chat-<id>` + sender's `private-user-<id>` |
| `notification` | `dispatchNotification()` in `app/libs/notifications/dispatch.ts` | recipient's `private-user-<id>` |

The event names match the SSE `event:` names, so `app/hooks/useLiveUpdates.ts`
feeds the same handler map to whichever transport is active.

### Client

- `app/hooks/useRealtime.ts` — one shared, lazily-created Pusher connection per
  tab, reference-counted per channel.
- `app/hooks/useLiveUpdates.ts` — the transport picker used by
  `ChatSidebar`, `messages/[chatId]/page.tsx` and `DataPreloader`. If Pusher
  reaches a `failed` / `unavailable` state it drops back to the SSE URL.

## Turning it off

Unset `NEXT_PUBLIC_REALTIME_ENABLED` (or set it to anything other than `1` /
`true`) and redeploy. The app immediately reverts to the SSE routes with no
other change. The Pusher server vars can be left in place; they're only read
when something publishes.

## Follow-ups (not done here)

- The typing/read routes still do their original `Chat` / `Message` writes so
  the SSE path keeps working. Once fully on realtime, the typing write (one
  `Chat` update roughly every 2s per active typer) can be dropped.
- Presence (`usePresence`, `/api/presence` heartbeat every 60s) still polls.
  Pusher **presence channels** could replace it entirely — separate change.
