import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
	Keypair,
	type PublicKey,
	SystemProgram,
	Transaction,
} from "@solana/web3.js";
import type { LiteSVM } from "litesvm";

const DEFAULT_PATH =
	process.env.SOLFORGE_FAUCET_PATH || ".solforge/faucet.json";
// Default to 1,000,000 SOL so we never run out in local dev.
// Override with SOLFORGE_FAUCET_LAMPORTS if desired.
const DEFAULT_INITIAL_LAMPORTS = BigInt(
	process.env.SOLFORGE_FAUCET_LAMPORTS || "1000000000000000",
); // 1e15 lamports = 1,000,000 SOL

type FaucetFile = { secretKey: string; publicKey: string; createdAt: string };

function ensureDir(path: string) {
	try {
		mkdirSync(dirname(path), { recursive: true });
	} catch {}
}

export function loadOrCreateFaucet(path: string = DEFAULT_PATH): Keypair {
	try {
		if (existsSync(path)) {
			const raw = readFileSync(path, "utf8");
			const data = JSON.parse(raw) as FaucetFile;
			const secret = Buffer.from(data.secretKey, "base64");
			return Keypair.fromSecretKey(new Uint8Array(secret));
		}
	} catch {}

	const kp = Keypair.generate();
	try {
		ensureDir(path);
		const payload: FaucetFile = {
			secretKey: Buffer.from(kp.secretKey).toString("base64"),
			publicKey: kp.publicKey.toBase58(),
			createdAt: new Date().toISOString(),
		};
		writeFileSync(path, JSON.stringify(payload, null, 2), "utf8");
	} catch {}
	return kp;
}

export function fundFaucetIfNeeded(
	svm: LiteSVM,
	faucet: Keypair,
	targetLamports: bigint = DEFAULT_INITIAL_LAMPORTS,
): bigint {
	let bal = 0n;
	try {
		bal = svm.getBalance(faucet.publicKey as PublicKey) || 0n;
	} catch {
		bal = 0n;
	}
	if (bal >= targetLamports) return bal;

	// Observed per-account airdrop cap ~10k SOL. Work around by creating feeder accounts,
	// airdropping to each, then transferring to the faucet until the target is reached.
	const LAMPORTS_PER_SOL = 1_000_000_000n;
	const PER_ACCOUNT_CAP = 10_000n * LAMPORTS_PER_SOL; // 10k SOL per feeder
	const FEE = 5_000n; // rough fee for legacy transfer

	let remaining = targetLamports - bal;
	let safety = 0;
	while (remaining > 0n && safety < 1000) {
		safety++;
		const feeder = Keypair.generate();
		const mint = remaining > PER_ACCOUNT_CAP ? PER_ACCOUNT_CAP : remaining;
		// Airdrop enough to cover transfer + fee
		try {
			svm.airdrop(feeder.publicKey as PublicKey, mint + FEE);
		} catch {
			// If airdrop fails, try smaller amount; if still fails, stop
			try {
				svm.airdrop(feeder.publicKey as PublicKey, 1_000_000_000n);
			} catch {
				break;
			}
		}

		// Transfer from feeder -> faucet
		try {
			const tx = new Transaction();
			try {
				tx.recentBlockhash = svm.latestBlockhash();
			} catch {}
			tx.add(
				SystemProgram.transfer({
					fromPubkey: feeder.publicKey,
					toPubkey: faucet.publicKey as PublicKey,
					lamports: Number(mint),
				}),
			);
			tx.sign(feeder);
			svm.sendTransaction(tx);
			remaining -= mint;
		} catch {}
	}

	try {
		bal = svm.getBalance(faucet.publicKey as PublicKey) || 0n;
	} catch {}
	return bal;
}
