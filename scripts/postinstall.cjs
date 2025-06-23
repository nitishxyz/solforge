#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const https = require("https");
const { execSync } = require("child_process");

const PACKAGE_NAME = "solforge";
const VERSION = require("../package.json").version;

// Platform mapping
const PLATFORM_MAP = {
  "darwin-x64": "darwin-x64",
  "darwin-arm64": "darwin-arm64",
  "linux-x64": "linux-x64",
  "linux-arm64": "linux-arm64",
  "win32-x64": "win32-x64.exe",
};

function getPlatform() {
  const platform = process.platform;
  const arch = process.arch;
  const key = `${platform}-${arch}`;

  if (!PLATFORM_MAP[key]) {
    console.error(`Unsupported platform: ${platform}-${arch}`);
    console.error("Supported platforms:", Object.keys(PLATFORM_MAP).join(", "));
    process.exit(1);
  }

  return PLATFORM_MAP[key];
}

function downloadBinary(url, destination) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);

    https
      .get(url, (response) => {
        if (response.statusCode === 200) {
          response.pipe(file);
          file.on("finish", () => {
            file.close();
            fs.chmodSync(destination, 0o755); // Make executable
            resolve();
          });
        } else if (response.statusCode === 302 || response.statusCode === 301) {
          // Handle redirects
          downloadBinary(response.headers.location, destination)
            .then(resolve)
            .catch(reject);
        } else {
          reject(new Error(`Failed to download: ${response.statusCode}`));
        }
      })
      .on("error", reject);
  });
}

async function install() {
  try {
    const platform = getPlatform();
    const binDir = path.join(__dirname, "..", "bin");
    const binaryName =
      process.platform === "win32" ? "solforge.exe" : "solforge";
    const binaryPath = path.join(binDir, binaryName);

    // Create bin directory
    if (!fs.existsSync(binDir)) {
      fs.mkdirSync(binDir, { recursive: true });
    }

    // Try to build locally first (if Bun is available)
    try {
      console.log("Attempting to build locally with Bun...");
      execSync(`bun build src/index.ts --compile --outfile ${binaryPath}`, {
        cwd: path.join(__dirname, ".."),
        stdio: "pipe",
      });
      console.log("✅ Built successfully with local Bun");
      return;
    } catch (e) {
      console.log("Local Bun build failed, downloading pre-built binary...");
    }

    // Download pre-built binary from GitHub releases
    const downloadUrl = `https://github.com/nitishxyz/solforge/releases/download/v${VERSION}/solforge-${platform}`;

    console.log(`Downloading ${PACKAGE_NAME} binary for ${platform}...`);
    console.log(`URL: ${downloadUrl}`);

    await downloadBinary(downloadUrl, binaryPath);
    console.log("✅ Binary downloaded and installed successfully");
  } catch (error) {
    console.error("❌ Installation failed:", error.message);
    console.error("\nFallback options:");
    console.error("1. Install Bun and run: bun install -g solforge");
    console.error("2. Clone the repo and build manually");
    process.exit(1);
  }
}

install();
