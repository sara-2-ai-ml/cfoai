import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "package.json"), "utf8"));

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version || "0.0.0"
  },
  serverExternalPackages: ["chromadb", "pdf-parse", "sharp", "xlsx", "xlsx-js-style", "three"],
  experimental: {
    middlewareClientMaxBodySize: "50mb",
    /** Next 15 default true — triggers SegmentViewNode RSC manifest errors in dev (Webpack + HMR). */
    devtoolSegmentExplorer: false
  }
};

export default nextConfig;
