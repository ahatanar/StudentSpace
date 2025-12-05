import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // Required for Docker deployment - creates minimal server.js
};

export default nextConfig;
