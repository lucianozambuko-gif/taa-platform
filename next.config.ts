import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // "standalone" bundles the server and only the node_modules it needs into
  // .next/standalone, so the site can run on cPanel's "Setup Node.js App"
  // (or any Node host) without installing packages on the server.
  output: "standalone",
};

export default nextConfig;
