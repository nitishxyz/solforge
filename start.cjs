#!/usr/bin/env node
// SolForge CLI bootstrapper
// - Checks if solforge binary exists in PATH (preinstalled/global)
// - Downloads and installs to ~/.local/bin if not found
// - Falls back to Bun-based TS entry if available

const fs = require("node:fs");
const path = require("node:path");
const https = require("node:https");
const os = require("node:os");
const { spawn, spawnSync } = require("node:child_process");

function pkg() {
	// Resolve package.json next to this file regardless of install location
	const p = path.join(__dirname, "package.json");
	try {
		return require(p);
	} catch {
		return { version: "" };
	}
}

function isInWorkspace() {
	return (
		fs.existsSync(path.join(__dirname, "src")) &&
		fs.existsSync(path.join(__dirname, "package.json"))
	);
}

function findBinaryInPath() {
	const pathDirs = (process.env.PATH || "").split(path.delimiter);
	const ext = process.platform === "win32" ? ".exe" : "";
	const binName = "solforge" + ext;

	for (const dir of pathDirs) {
		const binPath = path.join(dir, binName);
		if (fs.existsSync(binPath)) {
			try {
				const stat = fs.statSync(binPath);
				if (stat.isFile() && binPath !== __filename) {
					const result = spawnSync("file", [binPath], { encoding: "utf8" });
					if (!result.stdout || !result.stdout.includes("script text")) {
						return binPath;
					}
				}
			} catch (err) {}
		}
	}
	return null;
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

function downloadWithProgress(url, dest) {
	return new Promise((resolve, reject) => {
		const file = fs.createWriteStream(dest);
		let totalBytes = 0;
		let downloadedBytes = 0;

		function handleRedirect(response) {
			if (
				response.statusCode >= 300 &&
				response.statusCode < 400 &&
				response.headers.location
			) {
				https.get(response.headers.location, handleRedirect);
			} else if (response.statusCode === 200) {
				totalBytes = Number.parseInt(
					response.headers["content-length"] || "0",
					10
				);

				response.on("data", (chunk) => {
					downloadedBytes += chunk.length;
					if (totalBytes > 0) {
						const percent = ((downloadedBytes / totalBytes) * 100).toFixed(1);
						const downloadedMB = (downloadedBytes / 1024 / 1024).toFixed(1);
						const totalMB = (totalBytes / 1024 / 1024).toFixed(1);
						process.stdout.write(
							`\rDownloading: ${percent}% (${downloadedMB}MB / ${totalMB}MB)`
						);
					}
				});

				response.pipe(file);
				file.on("finish", () => {
					file.close();
					process.stdout.write("\n");
					resolve();
				});
			} else {
				reject(new Error(`Download failed: ${response.statusCode}`));
			}
		}

		https.get(url, handleRedirect).on("error", (err) => {
			file.close();
			reject(err);
		});
	});
}

function updateShellProfile(userBin) {
	if (process.platform === "win32") return;

	const shell = process.env.SHELL || "";
	let configFile;
	let shellType;

	if (shell.includes("zsh")) {
		configFile = path.resolve(os.homedir(), ".zshrc");
		shellType = "zsh";
	} else if (shell.includes("bash")) {
		configFile = path.resolve(os.homedir(), ".bashrc");
		shellType = "bash";
	} else {
		configFile = path.resolve(os.homedir(), ".profile");
		shellType = "shell";
	}

	const pathExport = 'export PATH="$HOME/.local/bin:$PATH"';

	try {
		let fileContent = "";
		if (fs.existsSync(configFile)) {
			fileContent = fs.readFileSync(configFile, "utf8");
		}

		if (fileContent.includes(".local/bin")) {
			console.log(`✓ PATH already configured in ${configFile}`);
			return;
		}

		fs.appendFileSync(configFile, `\n${pathExport}\n`);
		console.log(`✓ Added ${userBin} to PATH in ${configFile}`);
		console.log(`✓ Restart your ${shellType} or run: source ${configFile}`);
	} catch (error) {
		console.log(`⚠️  Could not automatically update ${configFile}`);
	}
}

async function install() {
	try {
		const asset = assetName();
		if (!asset) {
			throw new Error(`Unsupported platform: ${process.platform}-${process.arch}`);
		}

		const { version, repository } = pkg();
		const repo =
			process.env.SOLFORGE_REPO ||
			(repository &&
				(typeof repository === "string"
					? repository.replace(/^github:/, "")
					: repository.url &&
						(repository.url.match(/github\.com[:/](.+?)\.git$/) || [])[1])) ||
			"nitishxyz/solforge";

		const url = `https://github.com/${repo}/releases/latest/download/${asset}`;

		console.log(`Installing solforge (${process.platform}/${process.arch})...`);

		const userBin = path.resolve(os.homedir(), ".local", "bin");
		fs.mkdirSync(userBin, { recursive: true });
		const ext = process.platform === "win32" ? ".exe" : "";
		const binPath = path.resolve(userBin, `solforge${ext}`);

		await downloadWithProgress(url, binPath);

		fs.chmodSync(binPath, 0o755);

		const result = spawnSync(binPath, ["--version"], { encoding: "utf8" });
		if (result.status === 0) {
			console.log("\n✓ solforge installed successfully!");
			console.log(`Version: ${result.stdout.trim()}`);
			console.log(`Location: ${binPath}`);

			const pathDirs = (process.env.PATH || "").split(path.delimiter);
			if (!pathDirs.includes(userBin)) {
				updateShellProfile(userBin);
				console.log(`\n⚠️  Add ${userBin} to your PATH:`);
				console.log(
					`   echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc`
				);
				console.log(
					`   Or for zsh: echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc`
				);
			} else {
				console.log(`✓ ${userBin} already in PATH`);
			}
		} else {
			console.log(`\n✓ Installed to ${binPath}`);
		}

		console.log("\nRun: solforge --help");
		return binPath;
	} catch (error) {
		console.error("Failed to install solforge CLI:", error.message);
		console.error("\nPlease try installing manually:");
		console.error("  curl -fsSL https://sh.solforge.sh | sh");
		process.exit(1);
	}
}

function run(cmd, args) {
	return new Promise((resolve) => {
		const child = spawn(cmd, args, { stdio: "inherit" });
		child.on("exit", (code) => resolve(typeof code === "number" ? code : 0));
	});
}

(async () => {
	// Fast path for --version/--help without booting the app
	const args = process.argv.slice(2);
	if (
		args.includes("-v") ||
		args.includes("--version") ||
		args[0] === "version"
	) {
		console.log(pkg().version || "");
		process.exit(0);
	}
	if (args.includes("-h") || args.includes("--help") || args[0] === "help") {
		console.log(`
solforge <command>

Commands:
  (no command)        Run setup then start RPC & WS servers
  rpc start           Start RPC & WS servers
  start               Alias for 'rpc start'
  config init         Create sf.config.json in CWD
  config get <key>    Read a config value (dot path)
  config set <k> <v>  Set a config value
  airdrop --to <pubkey> --sol <amount>  Airdrop SOL via RPC faucet
  mint                 Interactive: pick mint, receiver, amount
  token clone <mint>  Clone SPL token mint + accounts
  program clone <programId>              Clone program code (and optionally accounts)
  program accounts clone <programId>     Clone accounts owned by program

Options:
  -h, --help          Show help
  -v, --version       Show version
  --network           Bind servers to 0.0.0.0 (LAN access)
  -y, --ci            Non-interactive; auto-accept prompts (use existing config)
`);
		process.exit(0);
	}

	if (isInWorkspace()) {
		const bun = process.env.SOLFORGE_BUN || "bun";
		const entry = path.join(__dirname, "src", "cli", "main.ts");
		const code = await run(bun, [entry, ...process.argv.slice(2)]);
		process.exit(code);
	}

	const pathBinary = findBinaryInPath();
	if (pathBinary) {
		const code = await run(pathBinary, process.argv.slice(2));
		process.exit(code);
	}

	const installedPath = await install();

	if (process.argv.length > 2) {
		const code = await run(installedPath, process.argv.slice(2));
		process.exit(code);
	}
})();
