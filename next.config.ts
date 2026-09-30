import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],
  reactStrictMode: true,
  images: {
    qualities: [75, 90, 100],
    remotePatterns: [
      { protocol: "https", hostname: "cdn.shopify.com", pathname: "/**" },
    ],
  },
  async redirects() {
    return [{ source: "/how", destination: "/", permanent: true }];
  },
};

export default nextConfig;
