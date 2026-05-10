import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Azure App Service 等へのデプロイ用（standalone の server.js を配信）
  output: "standalone",
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
