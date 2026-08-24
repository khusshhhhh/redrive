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
  async headers() {
    const scriptPolicy = process.env.NODE_ENV === 'production'
      ? "script-src 'self' 'unsafe-inline' https://maps.googleapis.com https://maps.gstatic.com"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com";
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(self), payment=(self), usb=()' },
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        { key: 'Content-Security-Policy', value: `default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; ${scriptPolicy}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' blob: data: https://res.cloudinary.com https://lh3.googleusercontent.com https://images.unsplash.com https://maps.googleapis.com https://maps.gstatic.com; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://api.cloudinary.com https://maps.googleapis.com https://maps.gstatic.com; worker-src 'self' blob:; upgrade-insecure-requests` },
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
    minimumCacheTTL: 60,
  },
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: [
      'react-icons',
      '@tabler/icons-react',
      'lucide-react'
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
