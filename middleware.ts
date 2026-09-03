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

function buildCsp(nonce: string): string {
  const dev = process.env.NODE_ENV !== "production";
  // Production drops 'unsafe-inline' for scripts: only this request's nonce
  // (and, via 'strict-dynamic', scripts those load) may run. `https:` is the
  // ignored-by-modern-browsers fallback for engines without strict-dynamic.
  const scriptSrc = dev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com https://va.vercel-scripts.com"
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https:`;

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    scriptSrc,
    // Tailwind + countless `style={...}` props mean inline styles stay; there
    // is no XSS-via-style vector here worth the churn of hashing every one.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' blob: data: https://res.cloudinary.com https://lh3.googleusercontent.com https://images.unsplash.com https://maps.googleapis.com https://maps.gstatic.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://api.cloudinary.com https://maps.googleapis.com https://maps.gstatic.com https://vitals.vercel-insights.com https://va.vercel-scripts.com https://*.pusher.com wss://*.pusher.com",
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
  ].join("; ");
}

function securityHeaders(request: NextRequest): NextResponse {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const csp = buildCsp(nonce);

  // Expose the nonce to server components / route handlers that render their
  // own <script> (none today need it — the JSON-LD blocks are non-executable
  // `application/ld+json` and Next nonces its own bootstrap scripts from the
  // response header below — but keep it available).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  // Correlation id for structured logs. Prefer the platform's own id.
  if (!requestHeaders.get("x-request-id")) {
    requestHeaders.set(
      "x-request-id",
      request.headers.get("x-vercel-id") || crypto.randomUUID(),
    );
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
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
