import type { PublicKey, TransactionInstruction } from "@solana/web3.js";
import {
    decodeMintToCheckedInstruction,
    decodeTransferInstruction,
    decodeTransferCheckedInstruction,
    decodeInitializeAccount3Instruction,
    decodeInitializeImmutableOwnerInstruction,
    decodeTransferCheckedInstructionUnchecked,
    decodeTransferInstructionUnchecked,
    decodeInitializeAccount3InstructionUnchecked,
    decodeInitializeImmutableOwnerInstructionUnchecked,
} from "@solana/spl-token";
import { u8 } from "@solana/buffer-layout";
import { PublicKey as PK } from "@solana/web3.js";
import {
    TOKEN_PROGRAM_ID as TOKEN_PROGRAM_V1,
    TOKEN_2022_PROGRAM_ID as TOKEN_PROGRAM_2022,
    getAssociatedTokenAddressSync,
} from "@solana/spl-token";

// Keep shape compatible with instruction-parser
export type ParsedInstruction =
	| {
			program: string;
			programId: string;
			parsed: { type: string; info: unknown };
	  }
	| { programId: string; accounts: string[]; data: string };

function ok(programId: string, type: string, info: unknown): ParsedInstruction {
    // Use a single label for both SPL v1 and Token-2022 for compatibility with UIs
    return { program: "spl-token", programId, parsed: { type, info } };
}

function asBase58(pk: PublicKey | undefined): string | undefined {
	try {
		return pk ? pk.toBase58() : undefined;
	} catch {
		return undefined;
	}
}

export function tryParseSplToken(
    ix: TransactionInstruction,
    programIdStr: string,
    _accountKeys: string[],
    dataBase58: string,
    tokenBalanceHints?: Array<{ mint: string; decimals: number }>,
): ParsedInstruction | null {
	try {
		// Accept both SPL Token and Token-2022 program ids
		// We pass the actual program id to decoders for strict match
		const programPk = new PK(programIdStr);
		// Don't early-return on program id; allow both programs

		// MintToChecked
		try {
			const m = decodeMintToCheckedInstruction(ix, programPk);
			const amount = m.data.amount;
			const decimals = m.data.decimals;
			const amtStr =
				typeof amount === "bigint" ? amount.toString() : String(amount);
			const base = BigInt(10) ** BigInt(decimals);
			const whole = BigInt(amtStr) / base;
			const frac = BigInt(amtStr) % base;
			const fracStr = frac
				.toString()
				.padStart(decimals, "0")
				.replace(/0+$/, "");
			const uiStr = fracStr.length ? `${whole}.${fracStr}` : `${whole}`;
			return ok(programIdStr, "mintToChecked", {
				account: asBase58(m.keys.destination.pubkey),
				mint: asBase58(m.keys.mint.pubkey),
				mintAuthority: asBase58(m.keys.authority.pubkey),
				tokenAmount: {
					amount: amtStr,
					decimals,
					uiAmount: Number(uiStr),
					uiAmountString: uiStr,
				},
			});
		} catch {}

		// Transfer / TransferChecked (strict)
		try {
			const t = decodeTransferInstruction(ix, programPk);
			const amt = t.data.amount;
			return ok(programIdStr, "transfer", {
				amount: typeof amt === "bigint" ? amt.toString() : String(amt),
				source: asBase58(t.keys.source.pubkey),
				destination: asBase58(t.keys.destination.pubkey),
				authority: asBase58(t.keys.owner.pubkey),
			});
		} catch {}

		try {
			const t = decodeTransferCheckedInstruction(ix, programPk);
			const amt = t.data.amount;
			const decimals = t.data.decimals;
			return ok(programIdStr, "transferChecked", {
				tokenAmount: {
					amount: typeof amt === "bigint" ? amt.toString() : String(amt),
					decimals,
				},
				source: asBase58(t.keys.source.pubkey),
				destination: asBase58(t.keys.destination.pubkey),
				authority: asBase58(t.keys.owner.pubkey),
				mint: asBase58(t.keys.mint.pubkey),
			});
		} catch {}

		// InitializeAccount3 (strict)
		try {
			const a = decodeInitializeAccount3Instruction(ix, programPk);
			return ok(programIdStr, "initializeAccount3", {
				account: asBase58(a.keys.account.pubkey),
				mint: asBase58(a.keys.mint.pubkey),
				owner: asBase58(a.data.owner),
			});
		} catch {}

		// InitializeImmutableOwner
		try {
			const im = decodeInitializeImmutableOwnerInstruction(ix, programPk);
			return ok(programIdStr, "initializeImmutableOwner", {
				account: asBase58(im.keys.account.pubkey),
			});
		} catch {}

		// GetAccountDataSize: decode extension types (u16 little-endian sequence)
		try {
			const bytes = Buffer.from(bs58decode(dataBase58));
			const t = u8().decode(bytes);
			// 21 corresponds to TokenInstruction.GetAccountDataSize
			if (t === 21) {
				const mint = asBase58(ix.keys[0]?.pubkey);
				const extCodes: number[] = [];
				for (let i = 1; i + 1 < bytes.length; i += 2) {
					const code = bytes[i] | (bytes[i + 1] << 8);
					extCodes.push(code);
				}
				const extMap: Record<number, string> = {
					7: "immutableOwner",
					8: "memoTransfer",
					9: "nonTransferable",
					12: "permanentDelegate",
					14: "transferHook",
					15: "transferHookAccount",
					18: "metadataPointer",
					19: "tokenMetadata",
					20: "groupPointer",
					21: "tokenGroup",
					22: "groupMemberPointer",
					23: "tokenGroupMember",
					25: "scaledUiAmountConfig",
					26: "pausableConfig",
					27: "pausableAccount",
				};
				const extensionTypes = extCodes.map((c) => extMap[c] || String(c));
				return ok(programIdStr, "getAccountDataSize", { mint, extensionTypes });
			}
		} catch {}

		// Unchecked fallbacks: decode data fields even if keys/validation missing
		try {
			const raw = bs58decode(dataBase58);
			const op = raw[0];
			// Transfer
			if (op === 3) {
				const t = decodeTransferInstructionUnchecked(ix);
				const amt = t.data.amount;
				return ok(programIdStr, "transfer", {
					amount: typeof amt === "bigint" ? amt.toString() : String(amt),
					source: asBase58(t.keys.source?.pubkey),
					destination: asBase58(t.keys.destination?.pubkey),
					authority: asBase58(t.keys.owner?.pubkey),
				});
			}
			// TransferChecked
            if (op === 12) {
                const t = decodeTransferCheckedInstructionUnchecked(ix);
                const amt = t.data.amount;
                const decimals = t.data.decimals;
                const hintMint = (() => {
                    try {
                        const dec = Number(decimals);
                        const candidates = (tokenBalanceHints || []).filter(
                            (h) => Number(h.decimals) === dec,
                        );
                        if (candidates.length === 1) return candidates[0].mint;
                        // Prefer non-zero decimals over 0 (filters out native 4uQe mint in many cases)
                        const nonZero = candidates.filter((c) => c.decimals > 0);
                        if (nonZero.length === 1) return nonZero[0].mint;
                        // Fall back to first candidate if multiple
                        return candidates[0]?.mint;
                    } catch {
                        return undefined;
                    }
                })();
                return ok(programIdStr, "transferChecked", {
                    tokenAmount: {
                        amount: typeof amt === "bigint" ? amt.toString() : String(amt),
                        decimals,
                    },
                    source: asBase58(t.keys.source?.pubkey),
                    destination: asBase58(t.keys.destination?.pubkey),
                    authority: asBase58(t.keys.owner?.pubkey),
                    mint: asBase58(t.keys.mint?.pubkey) || hintMint,
                });
            }
			// InitializeAccount3
            if (op === 18) {
                const a = decodeInitializeAccount3InstructionUnchecked(ix);
                const hintMint = (() => {
                    try {
                        // Prefer single non-zero-decimals mint in this tx
                        const nonZero = (tokenBalanceHints || []).filter(
                            (h) => h.decimals > 0,
                        );
                        if (nonZero.length === 1) return nonZero[0].mint;
                        // Fall back to first available mint
                        return (tokenBalanceHints || [])[0]?.mint;
                    } catch {
                        return undefined;
                    }
                })();
                const ownerStr = asBase58(a.data.owner);
                const mintStr = asBase58(a.keys.mint?.pubkey) || hintMint;
                let accountStr = asBase58(a.keys.account?.pubkey);
                try {
                    if (!accountStr && ownerStr && mintStr) {
                        const ownerPk = new PK(ownerStr);
                        const mintPk = new PK(mintStr);
                        const programId =
                            programIdStr === TOKEN_PROGRAM_2022.toBase58()
                                ? TOKEN_PROGRAM_2022
                                : TOKEN_PROGRAM_V1;
                        const ata = getAssociatedTokenAddressSync(
                            mintPk,
                            ownerPk,
                            true,
                            programId,
                        );
                        accountStr = ata.toBase58();
                    }
                } catch {}
                return ok(programIdStr, "initializeAccount3", {
                    account: accountStr,
                    mint: mintStr,
                    owner: ownerStr,
                });
            }
			// InitializeImmutableOwner
			if (op === 22) {
				const im = decodeInitializeImmutableOwnerInstructionUnchecked(ix);
				return ok(programIdStr, "initializeImmutableOwner", {
					account: asBase58(im.keys.account?.pubkey),
				});
			}
		} catch {}

		// Fallback: classify by TokenInstruction opcode (first byte) when nothing else matched
		try {
			const raw = bs58decode(dataBase58);
			if (raw.length > 0) {
				const op = raw[0];
				const map: Record<number, string> = {
					0: "initializeMint",
					1: "initializeAccount",
					2: "initializeMultisig",
					3: "transfer",
					4: "approve",
					5: "revoke",
					6: "setAuthority",
					7: "mintTo",
					8: "burn",
					9: "closeAccount",
					10: "freezeAccount",
					11: "thawAccount",
					12: "transferChecked",
					13: "approveChecked",
					14: "mintToChecked",
					15: "burnChecked",
					16: "initializeAccount2",
					17: "syncNative",
					18: "initializeAccount3",
					19: "initializeMultisig2",
					20: "initializeMint2",
					21: "getAccountDataSize",
					22: "initializeImmutableOwner",
					23: "amountToUiAmount",
					24: "uiAmountToAmount",
					25: "initializeMintCloseAuthority",
					26: "transferFeeExtension",
					27: "confidentialTransferExtension",
					28: "defaultAccountStateExtension",
					29: "reallocate",
					30: "memoTransferExtension",
					31: "createNativeMint",
					32: "initializeNonTransferableMint",
					33: "interestBearingMintExtension",
					34: "cpiGuardExtension",
					35: "initializePermanentDelegate",
					36: "transferHookExtension",
					39: "metadataPointerExtension",
					40: "groupPointerExtension",
					41: "groupMemberPointerExtension",
					43: "scaledUiAmountExtension",
					44: "pausableExtension",
				};
				const type = map[op];
				if (type) return ok(programIdStr, type, {});
			}
		} catch {}

		// Unknown SPL token instruction (unrecognized opcode)
		return null;
	} catch {
		return null;
	}
}

// Local base58 decode to avoid importing from sibling file
const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const BASE = BigInt(ALPHABET.length);
function bs58decode(str: string): Uint8Array {
	let num = 0n;
	for (const char of str) {
		const index = ALPHABET.indexOf(char);
		if (index === -1) throw new Error("Invalid base58 character");
		num = num * BASE + BigInt(index);
	}
	const bytes: number[] = [];
	while (num > 0n) {
		bytes.unshift(Number(num % 256n));
		num = num / 256n;
	}
	for (let i = 0; i < str.length && str[i] === "1"; i++) bytes.unshift(0);
	return new Uint8Array(bytes.length > 0 ? bytes : [0]);
}
