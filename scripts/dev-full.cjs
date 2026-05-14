/**
 * dev:full — start Chroma (Docker Compose) + Next when Docker is available;
 * otherwise print install hints and start Next.js only (no wait-on).
 */
const { execSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: "inherit", shell: true, cwd: root, ...opts });
}

function dockerOnPath() {
  try {
    execSync("docker --version", { stdio: "ignore", shell: true, cwd: root });
    return true;
  } catch {
    return false;
  }
}

async function runWithDocker() {
  const concurrently = require("concurrently");
  await concurrently(
    [
      { command: "docker compose up --abort-on-container-exit", name: "chroma", cwd: root },
      {
        command:
          "wait-on -t 120000 tcp:127.0.0.1:8000 && node scripts/print-ports.cjs && npx next dev -p 3000",
        name: "next",
        cwd: root
      }
    ],
    {
      prefixColors: ["blue", "magenta"],
      killOthersOn: ["failure"]
    }
  ).result;
}

async function main() {
  run("node scripts/ensure-fallback-build-manifest.cjs");

  if (!dockerOnPath()) {
    console.warn("\n\x1b[33m[!] Docker nuk u gjet në PATH.\x1b[0m");
    console.warn("    Instalo Docker Desktop për Windows dhe rihap këtë terminal:");
    console.warn("    https://docs.docker.com/desktop/setup/install/windows-install/");
    console.warn(
      "\n    Pas instalimit, hap Docker Desktop një herë, pastaj:  npm run dev:full\n"
    );
    console.warn(
      "\x1b[33mTani nis vetëm Next.js\x1b[0m (pa pritur Chroma). Upload / RAG do të dështojnë derisa Chroma të jetë në " +
        (process.env.CHROMA_URL || "http://localhost:8000") +
        ".\n"
    );
    run("node scripts/print-ports.cjs");
    run("npx next dev -p 3000");
    return;
  }

  await runWithDocker();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
