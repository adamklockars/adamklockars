import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static site: `next build` emits a static `out/` folder that can be
  // dropped on any CDN / static host (Vercel, Cloudflare Pages, GitHub Pages).
  output: "export",
  // Static export can't use the on-the-fly Image Optimization server.
  images: { unoptimized: true },
  // Emit each route as a folder with index.html — most portable across hosts.
  trailingSlash: true,
};

export default nextConfig;
