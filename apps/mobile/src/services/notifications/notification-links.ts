import { safeDeepLinkDestination } from "../links/deep-links";

type NotificationLinkOptions = { appScheme: string; verifiedHost?: string };

export function notificationDestination(data: unknown, options: NotificationLinkOptions) {
  if (!data || typeof data !== "object") return "/";
  const payload = data as Record<string, unknown>;
  if (typeof payload.resourceId !== "string") return "/";
  const prefix = payload.type === "listing" ? "listings" : payload.type === "trip" ? "trips" : payload.type === "message" ? "messages" : null;
  if (!prefix) return "/";
  return safeDeepLinkDestination(`/${prefix}/${payload.resourceId}`, options);
}
