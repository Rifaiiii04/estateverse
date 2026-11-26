import type { NextConfig } from "next";

// Baseline protection for every page: no framing (clickjacking), HTTPS only, no MIME sniffing, and a tight referrer.
// A full Content-Security-Policy is intentionally not set here: map tiles, 3D assets, and Next's inline scripts need a
// nonce-based policy, so only the frame-ancestors directive is enforced for now.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self), payment=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  poweredByHeader: false,
  // Applies the security headers to all pages and static files served by Next.js.
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
