import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require a signed-in user. Everything else is public but still
// gets the security headers below.
const PROTECTED = [
  /^\/trips(\/|$)/,
  /^\/reservations(\/|$)/,
  /^\/properties(\/|$)/,
  /^\/favorites(\/|$)/,
  /^\/profile(\/|$)/,
  /^\/messages(\/|$)/,
  /^\/confirm-reservation(\/|$)/,
  /^\/review\//,
  /^\/edit-utility(\/|$)/,
  /^\/host(\/|$)/,
];

// One static CSP for every document response.
//
// Scripts keep `'unsafe-inline'` in production. A per-request nonce is *not*
// viable here: many pages (`/`, the landing pages, blog, newsroom, help-centre)
// are statically generated, so their HTML is fixed at build time and cannot
// carry a fresh nonce — combined with `'strict-dynamic'` (which makes browsers
// ignore `'self'`/`https:`) that blocks every Next.js script and the page
// renders its SSR shell but never hydrates. `'unsafe-inline'` for scripts is the
// Next-compatible baseline; `object-src 'none'` + `base-uri 'self'` remove the
// main inline-script escalation vectors.
function buildCsp(): string {
  const dev = process.env.NODE_ENV !== "production";
  const scriptSrc = dev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com https://va.vercel-scripts.com"
    : "script-src 'self' 'unsafe-inline' https://maps.googleapis.com https://maps.gstatic.com https://va.vercel-scripts.com";

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' blob: data: https://res.cloudinary.com https://lh3.googleusercontent.com https://images.unsplash.com https://maps.googleapis.com https://maps.gstatic.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://api.cloudinary.com https://maps.googleapis.com https://maps.gstatic.com https://vitals.vercel-insights.com https://va.vercel-scripts.com https://*.pusher.com wss://*.pusher.com https://*.ingest.sentry.io https://*.ingest.de.sentry.io https://*.ingest.us.sentry.io",
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
  ].join("; ");
}

const CSP = buildCsp();

function securityHeaders(request: NextRequest): NextResponse {
  // Correlation id for structured logs. Prefer the platform's own id.
  const requestHeaders = new Headers(request.headers);
  if (!requestHeaders.get("x-request-id")) {
    requestHeaders.set(
      "x-request-id",
      request.headers.get("x-vercel-id") || crypto.randomUUID(),
    );
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", CSP);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(), geolocation=(self), payment=(self), usb=()",
  );
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );
  return response;
}

export default withAuth(
  function middleware(request) {
    return securityHeaders(request);
  },
  {
    callbacks: {
      // Gate only the protected routes; everything else passes through so the
      // security headers still apply site-wide.
      authorized: ({ req, token }) => {
        const path = req.nextUrl.pathname;
        if (PROTECTED.some((pattern) => pattern.test(path))) return Boolean(token);
        return true;
      },
    },
  },
);

export const config = {
  // Run on every document route; skip API routes (they set their own headers
  // and NextAuth owns /api/auth) and static assets.
  matcher: [
    "/((?!api/|monitoring|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|map)$).*)",
  ],
};
