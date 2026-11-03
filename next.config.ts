import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  experimental: {
    agentUpgrade: "security",
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
