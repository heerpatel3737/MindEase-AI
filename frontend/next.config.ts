import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const isVercel = process.env.VERCEL === "1";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  ...(isVercel
    ? {}
    : {
        turbopack: {
          root: rootDir,
        },
      }),
};

export default nextConfig;

