import type { TransactionInstruction } from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";

// Keep shape compatible with instruction-parser
export type ParsedInstruction =
	| {
			program: string;
			programId: string;
			parsed: { type: string; info: unknown };
	  }
	| { programId: string; accounts: string[]; data: string };

function ok(programId: string, type: string, info: unknown): ParsedInstruction {
	return {
		program: "spl-associated-token-account",
		programId,
		parsed: { type, info },
	};
}

function asBase58(ix: TransactionInstruction, idx: number): string | undefined {
	try {
		return ix.keys[idx]?.pubkey?.toBase58();
	} catch {
		return undefined;
	}
}

export function tryParseAta(
	ix: TransactionInstruction,
	programIdStr: string,
): ParsedInstruction | null {
	try {
		if (!ix.programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID)) return null;
		// Both create (empty) and createIdempotent ([1]) map to type "create" in explorers
		const type = "create";
		// Expected keys: [payer, associatedToken, owner, mint, systemProgram, tokenProgram]
		const info = {
			source: asBase58(ix, 0),
			account: asBase58(ix, 1),
			wallet: asBase58(ix, 2),
			mint: asBase58(ix, 3),
			systemProgram: asBase58(ix, 4),
			tokenProgram: asBase58(ix, 5),
		};
		return ok(programIdStr, type, info);
	} catch {
		return null;
	}
}
