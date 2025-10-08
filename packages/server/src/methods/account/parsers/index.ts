import { PublicKey } from "@solana/web3.js";
import type { RpcMethodContext } from "../../../types";
import { parseUpgradeableLoader } from "./loader-upgradeable";
import { parseSplTokenAccountOrMint } from "./spl-token";
import { parseSystemAccount } from "./system";

export type ParsedAccountData = {
	program: string;
	parsed: unknown; // match Solana RPC jsonParsed payloads
	space: number;
} | null;

export function parseAccountJson(
	pubkey: PublicKey,
	account: {
		owner: PublicKey | string;
		data: Uint8Array | Buffer | number[];
		lamports: bigint | number;
		executable?: boolean;
		rentEpoch?: bigint | number;
	},
	context: RpcMethodContext,
): ParsedAccountData {
	const ownerStr =
		typeof account.owner === "string"
			? account.owner
			: new PublicKey(account.owner).toBase58();
	const ownerPk =
		typeof account.owner === "string"
			? new PublicKey(account.owner)
			: (account.owner as PublicKey);
	const dataBytes =
		account.data instanceof Uint8Array
			? account.data
			: Buffer.from(account.data as ReadonlyArray<number>);
	const space = dataBytes.length;

	// 1) System program
	const sys = parseSystemAccount(ownerStr, space);
	if (sys) return sys;

	// 2) SPL Token (v1) & Token-2022
	const token = parseSplTokenAccountOrMint(pubkey, ownerPk, dataBytes, context);
	if (token) return token;

	// 3) BPF Upgradeable Loader
	const loader = parseUpgradeableLoader(ownerStr, dataBytes, context);
	if (loader) return loader;

	// 4) Unknown
	return { program: "unknown", parsed: null, space };
}
