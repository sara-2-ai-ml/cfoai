/**
 * Next.js (dev + prod error paths) may read `.next/fallback-build-manifest.json`.
 * If it is missing while `build-manifest.json` exists, copy the latter — fixes
 * ENOENT after a partial/corrupt `.next` or racing first request.
 */
const fs = require("fs");
const path = require("path");

const dist = path.join(process.cwd(), ".next");
const buildPath = path.join(dist, "build-manifest.json");
const fallbackPath = path.join(dist, "fallback-build-manifest.json");

try {
  if (!fs.existsSync(buildPath)) {
    process.exit(0);
  }
  if (fs.existsSync(fallbackPath)) {
    process.exit(0);
  }
  fs.copyFileSync(buildPath, fallbackPath);
  // eslint-disable-next-line no-console
  console.log("[ensure-fallback-build-manifest] wrote", path.relative(process.cwd(), fallbackPath));
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn("[ensure-fallback-build-manifest]", e && e.message ? e.message : e);
  process.exit(0);
}
