import * as p from "@clack/prompts";
import { PublicKey } from "@solana/web3.js";

export function cancelSetup(): never {
	p.cancel("Setup canceled.");
	process.exit(0);
}

export function validatePort(v: string): string | undefined {
	const num = Number(v);
	if (Number.isNaN(num) || num < 1024 || num > 65535)
		return "Port must be between 1024 and 65535";
	return undefined;
}

export function validatePubkey(v: string): string | undefined {
	try {
		new PublicKey(v);
		return undefined;
	} catch {
		return "Invalid public key";
	}
}

export function validatePositiveNumber(v: string): string | undefined {
	const num = Number(v);
	if (Number.isNaN(num) || num <= 0) return "Must be a positive number";
	return undefined;
}

export function ensure<T>(v: T | symbol): T {
	if (typeof v === "symbol") cancelSetup();
	return v;
}

export async function collectCustomEntries(label: string): Promise<string[]> {
	const entries: string[] = [];
	while (true) {
		const value = await p.text({
			message:
				entries.length === 0
					? `Enter ${label} (leave blank to skip)`
					: `Add another ${label} (leave blank to finish)`,
		});
		if (p.isCancel(value)) cancelSetup();
		const trimmed = typeof value === "string" ? value.trim() : "";
		if (!trimmed) break;
		const error = validatePubkey(trimmed);
		if (error) {
			p.log.error(error);
			continue;
		}
		entries.push(trimmed);
	}
	return entries;
}
