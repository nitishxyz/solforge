#!/usr/bin/env node
/*
  SolForge postinstall: fetch the platform-specific prebuilt binary from GitHub Releases.
  - Skips if SOLFORGE_SKIP_DOWNLOAD=true
  - Falls back silently on errors (CLI will still work via Bun if installed)
*/
const fs = require("fs");
const path = require("path");
const https = require("https");

function log(msg) {
  console.log(`[solforge] ${msg}`);
}
function warn(msg) {
  console.warn(`[solforge] ${msg}`);
}

if (String(process.env.SOLFORGE_SKIP_DOWNLOAD || "").toLowerCase() === "true") {
  log("Skipping binary download due to SOLFORGE_SKIP_DOWNLOAD=true");
  process.exit(0);
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

function getRepo() {
  try {
    const pkg = require(path.join(__dirname, "..", "package.json"));
    if (pkg.repository) {
      if (typeof pkg.repository === "string") return pkg.repository.replace(/^github:/, "");
      if (pkg.repository.url) {
        const m = pkg.repository.url.match(/github\.com[:/](.+?)\.git$/);
        if (m) return m[1];
      }
    }
  } catch {}
  return process.env.SOLFORGE_REPO || "nitishxyz/solforge";
}

function getVersion() {
  try {
    const pkg = require(path.join(__dirname, "..", "package.json"));
    return pkg.version;
  } catch {
    return process.env.npm_package_version || "";
  }
}

const name = assetName();
if (!name) {
  warn(`No prebuilt binary for ${process.platform}/${process.arch}; skipping`);
  process.exit(0);
}

const version = getVersion();
if (!version) {
  warn("Unable to determine package version; skipping binary download");
  process.exit(0);
}

const repo = getRepo();
const url = `https://github.com/${repo}/releases/download/v${version}/${name}`;

const vendorDir = path.join(__dirname, "..", "vendor");
const outPath = path.join(vendorDir, name);

if (fs.existsSync(outPath)) {
  log(`Binary already present at vendor/${name}`);
  process.exit(0);
}

fs.mkdirSync(vendorDir, { recursive: true });

function download(to, from, cb, redirects = 0) {
  const req = https.get(from, (res) => {
    if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && redirects < 5) {
      return download(to, res.headers.location, cb, redirects + 1);
    }
    if (res.statusCode !== 200) {
      return cb(new Error(`HTTP ${res.statusCode} for ${from}`));
    }
    const file = fs.createWriteStream(to, { mode: 0o755 });
    res.pipe(file);
    file.on("finish", () => file.close(cb));
  });
  req.on("error", (err) => cb(err));
}

log(`Fetching ${name} for v${version}...`);
download(outPath, url, (err) => {
  if (err) {
    warn(`Could not download prebuilt binary: ${err.message}`);
    warn("CLI will fall back to running via Bun if available.");
    try { fs.unlinkSync(outPath); } catch {}
    process.exit(0);
  }
  if (process.platform !== "win32") {
    try { fs.chmodSync(outPath, 0o755); } catch {}
  }
  log(`Installed vendor/${name}`);
});

