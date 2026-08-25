export type RedriveDeepLinkKind = "listing" | "trip" | "message";

export type RedriveDeepLink = {
  href: string;
  kind: RedriveDeepLinkKind;
  resourceId: string;
  requiresAuthentication: boolean;
};

type DeepLinkOptions = {
  appScheme: string;
  verifiedHost?: string;
};

const objectIdPattern = /^[a-f\d]{24}$/i;

function normalizedPath(value: string, options: DeepLinkOptions) {
  if (value.startsWith("/") && !value.startsWith("//")) return value.split(/[?#]/, 1)[0];

  const url = new URL(value);
  const protocol = url.protocol.toLowerCase();
  if (protocol === "https:") {
    if (!options.verifiedHost || url.hostname.toLowerCase() !== options.verifiedHost.toLowerCase()) return null;
    return url.pathname;
  }

  if (protocol !== `${options.appScheme.toLowerCase()}:`) return null;
  const hostSegment = url.hostname && url.hostname !== "app" ? `/${url.hostname}` : "";
  return `${hostSegment}${url.pathname}` || "/";
}

export function parseRedriveDeepLink(value: string, options: DeepLinkOptions): RedriveDeepLink | null {
  try {
    const pathname = normalizedPath(value.trim(), options);
    if (!pathname) return null;
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length !== 2 || !objectIdPattern.test(segments[1])) return null;
    const resourceId = segments[1];

    if (segments[0] === "listings") {
      return { href: `/(public)/listing/${resourceId}`, kind: "listing", resourceId, requiresAuthentication: false };
    }
    if (segments[0] === "trips") {
      return { href: `/(app)/reservation/${resourceId}`, kind: "trip", resourceId, requiresAuthentication: true };
    }
    if (segments[0] === "messages") {
      return { href: `/(app)/chat/${resourceId}`, kind: "message", resourceId, requiresAuthentication: true };
    }
    return null;
  } catch {
    return null;
  }
}

export function safeDeepLinkDestination(value: string, options: DeepLinkOptions) {
  return parseRedriveDeepLink(value, options)?.href || "/";
}
