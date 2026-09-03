// Shared realtime vocabulary — safe to import from both client and server
// (no Node-only or "pusher" imports here).
//
// Transport is pluggable. When the Pusher env vars (server) and
// NEXT_PUBLIC_REALTIME_ENABLED (client) are set, chat + notification updates
// are pushed over Pusher Channels. Otherwise the app falls back to the
// existing short-lived SSE polling routes, which stay in place untouched.

/** True on the client when a realtime transport is configured. */
export const REALTIME_ENABLED =
  process.env.NEXT_PUBLIC_REALTIME_ENABLED === "1" ||
  process.env.NEXT_PUBLIC_REALTIME_ENABLED === "true";

// Channel names use only characters Pusher allows and the `private-` prefix so
// every subscription goes through the auth endpoint below.

/** Per-user channel: inbox list changes, notification bumps, read receipts on
 *  the viewer's own messages. */
export const userChannel = (userId: string) => `private-user-${userId}`;

/** Per-conversation channel: new messages, typing, read receipts. */
export const chatChannel = (chatId: string) => `private-chat-${chatId}`;

/** Event names carried on the channels above. Values match the SSE `event:`
 *  names so a handler map works with either transport. */
export const RealtimeEvent = {
  /** chat channel — a new message (payload: SafeMessage) */
  Message: "message",
  /** chat channel — `{ userId, isTyping }` */
  Typing: "typing",
  /** chat + user channel — `{ messageIds: string[] }` read by the other party */
  Read: "read",
  /** user channel — inbox row moved/updated (payload: SafeChat summary) */
  ChatUpdate: "chat-update",
  /** user channel — a notification-centre entry was created (payload: {type,title}) */
  Notification: "notification",
} as const;

export type RealtimeEventName =
  (typeof RealtimeEvent)[keyof typeof RealtimeEvent];
