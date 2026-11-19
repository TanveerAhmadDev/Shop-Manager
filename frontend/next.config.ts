import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "http://192.168.2.132:5000/api/v1/:path*",
      },
    ];
  },
  allowedDevOrigins: [
    "192.168.2.132",
    "scientific-bicycle-refuse-males.trycloudflare.com",
  ],
  cacheComponents: true,
  partialPrefetching: true,
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
