import type { NextConfig } from "next";

const internalApi =
  process.env.INTERNAL_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "http://127.0.0.1:8000"
    : "http://localhost:8000");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${internalApi}/api/:path*` },
      { source: "/health", destination: `${internalApi}/health` },
      { source: "/docs", destination: `${internalApi}/docs` },
      { source: "/openapi.json", destination: `${internalApi}/openapi.json` },
    ];
  },
};

export default nextConfig;
