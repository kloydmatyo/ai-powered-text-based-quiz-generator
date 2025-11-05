import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Use Turbopack configuration instead of webpack
  turbopack: {
    // Empty config to silence the warning
  },
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },
  // Handle server-side dependencies
  serverExternalPackages: ['canvas', 'pdf-parse']
};

export default nextConfig;
