/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@redrive/contracts'],
  // Keep native Sharp and its dynamically-loaded libvips binary inside the
  // licence verification function on Linux deployments such as Vercel.
  outputFileTracingRoot: __dirname,
  outputFileTracingIncludes: {
    '/api/license-verification': [
      './node_modules/sharp/**/*',
      './node_modules/@img/sharp-linux-x64/**/*',
      './node_modules/@img/sharp-libvips-linux-x64/**/*',
    ],
  },
  serverExternalPackages: ['sharp'],
  // The Content-Security-Policy is set in middleware.ts (one static policy;
  // see the note there on why a per-request nonce isn't viable with our
  // statically-generated pages). These headers stay here so they also cover
  // /api and static assets, which the middleware matcher skips.
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(self), payment=(self), usb=()' },
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      ],
    }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
    formats: ['image/avif', 'image/webp'],
    // Listing uploads use versioned Cloudinary URLs, so optimised derivatives
    // can remain cached for a day without serving a replaced image forever.
    minimumCacheTTL: 86400,
  },
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: [
      '@tabler/icons-react',
      'lucide-react'
    ],
  },
  eslint: {
    // Lint errors fail the build. Only the `app` tree is linted (the mobile
    // workspace and scripts have their own configs).
    ignoreDuringBuilds: false,
    dirs: ['app'],
  },
};

// Sentry wraps the config for source-map upload + tunnelling. It's inert when
// SENTRY_DSN / SENTRY_AUTH_TOKEN aren't set, so local builds are unaffected.
const { withSentryConfig } = require('@sentry/nextjs/config');

module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Quiet unless there's actually a token to upload with — otherwise every
  // build (Vercel included) logs "No auth token provided" three times.
  silent: !process.env.SENTRY_AUTH_TOKEN,
  // Proxy browser Sentry requests through the app to dodge ad-blockers.
  tunnelRoute: '/monitoring',
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  telemetry: false,
});
