import type { NextConfig } from 'next';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';

// 'unsafe-eval' is only required by Turbopack's dev-time HMR. Production
// bundles are pre-compiled, so we can drop it and keep the CSP strict.
const isDev = process.env.NODE_ENV === 'development';
const scriptSrc = isDev
  ? "'self' 'unsafe-inline' 'unsafe-eval'"
  : "'self' 'unsafe-inline'";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Security headers: CSP + hardening headers to mitigate XSS and clickjacking.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Next.js injects inline scripts/styles at runtime.
              `script-src ${scriptSrc}`,
              "style-src 'self' 'unsafe-inline' https://api.fontshare.com",
              "font-src 'self' data: https://cdn.fontshare.com",
              "img-src 'self' data: blob: https://placehold.co",
              `connect-src 'self' ${supabaseUrl} https://*.supabase.co`,
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // HSTS is only meaningful over HTTPS; skip it in local dev so
          // http://localhost keeps working.
          ...(isDev
            ? []
            : [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains; preload',
                },
              ]),
        ],
      },
    ];
  },
};

export default nextConfig;