import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker and standalone build configuration
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  
  // Disable dev indicators (build indicator, etc.)
  devIndicators: false,
  
  // Allow access from any host
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS, PATCH",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, Pragma",
          },
          {
            key: "Access-Control-Allow-Credentials",
            value: "true",
          },
        ],
      },
    ];
  },
  
  // Ensure server can be accessed from any IP
  experimental: {
    serverActions: {
      allowedOrigins: ["*"],
    },
  },
  
  // Image optimization for Docker
  images: {
    unoptimized: true, // Disable Next.js image optimization for Docker
  },
  
  // Disable host checks for development
  ...(process.env.NODE_ENV === 'development' && {
    async rewrites() {
      return [
        {
          source: '/:path*',
          destination: '/:path*',
        },
      ];
    },
  }),
};

export default nextConfig;
