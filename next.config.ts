import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp/cheerio are scraper-only; keep them out of the app bundle.
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
