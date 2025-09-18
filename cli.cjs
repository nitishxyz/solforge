#!/usr/bin/env node
// SolForge CLI bootstrapper
// - Prefers a prebuilt vendor binary (downloaded via postinstall or on first run)
// - Falls back to Bun-based TS entry if available

const fs = require("node:fs");
const path = require("node:path");
const https = require("node:https");
const { spawn } = require("node:child_process");

function pkg() {
  // Resolve package.json next to this file regardless of install location
  const p = path.join(__dirname, "package.json");
  try { return require(p); } catch { return { version: "" }; }
}

function assetName() {
  const p = process.platform;
  const a = process.arch;
  if (p === "darwin" && a === "arm64") return "solforge-darwin-arm64";
  if (p === "darwin" && a === "x64") return "solforge-darwin-x64";
  if (p === "linux" && a === "x64") return "solforge-linux-x64";
  if (p === "linux" && a === "arm64") return "solforge-linux-arm64";
  if (p === "win32" && a === "x64") return "solforge-windows-x64.exe";
  return null;
}

function vendorPath() {
  const name = assetName();
  if (!name) return null;
  return path.join(__dirname, "vendor", name);
}

function download(url, outPath) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        return resolve(download(res.headers.location, outPath));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const file = fs.createWriteStream(outPath, { mode: process.platform === "win32" ? undefined : 0o755 });
      res.pipe(file);
      file.on("finish", () => file.close(() => resolve()));
      file.on("error", reject);
    });
    req.on("error", reject);
  });
}

async function ensureBinary() {
  const vp = vendorPath();
  if (!vp) return null;
  if (fs.existsSync(vp)) return vp;

  // Respect opt-out
  if (String(process.env.SOLFORGE_SKIP_DOWNLOAD || "").toLowerCase() === "true") {
    return null;
  }

  const { version, repository } = pkg();
  const repo = process.env.SOLFORGE_REPO || (repository && (typeof repository === "string" ? repository.replace(/^github:/, "") : (repository.url && (repository.url.match(/github\.com[:/](.+?)\.git$/) || [])[1]))) || "nitishxyz/solforge";
  if (!version) return null;
  const asset = path.basename(vp);
  const url = `https://github.com/${repo}/releases/download/v${version}/${asset}`;

  try {
    fs.mkdirSync(path.dirname(vp), { recursive: true });
    await download(url, vp);
    if (process.platform !== "win32") {
      try { fs.chmodSync(vp, 0o755); } catch {}
    }
    return fs.existsSync(vp) ? vp : null;
  } catch {
    return null;
  }
}

function run(cmd, args) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("exit", (code) => resolve(typeof code === "number" ? code : 0));
  });
}

(async () => {
  const vp = await ensureBinary();
  if (vp) {
    const code = await run(vp, process.argv.slice(2));
    process.exit(code);
  }
  // Fallback: try to run TS entry via Bun
  const bun = process.env.SOLFORGE_BUN || "bun";
  const entry = path.join(__dirname, "src", "cli", "main.ts");
  const code = await run(bun, [entry, ...process.argv.slice(2)]);
  if (code !== 0) {
    console.error("solforge: failed to run binary and Bun fallback. Install Bun or ensure a release asset exists.");
  }
  process.exit(code);
})();

