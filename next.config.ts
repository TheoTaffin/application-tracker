import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  // Self-contained server for the Docker image (no node_modules needed at runtime).
  output: "standalone",
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    serverActions: {
      // A new application can carry a resume plus attachments (10 MB each, see
      // MAX_UPLOAD_BYTES), plus multipart overhead.
      bodySizeLimit: "35mb",
    },
  },
  // jsdom loads files at runtime that the bundler can't trace; keep it external.
  serverExternalPackages: ["jsdom"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
