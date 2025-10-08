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
	// Additional core instruction decoders
	decodeApproveInstruction,
	decodeApproveCheckedInstruction,
	decodeRevokeInstruction,
	decodeSetAuthorityInstruction,
	decodeMintToInstruction,
	decodeBurnInstruction,
	decodeBurnCheckedInstruction,
	decodeCloseAccountInstruction,
	decodeFreezeAccountInstruction,
	decodeThawAccountInstruction,
	decodeInitializeAccountInstruction,
	decodeInitializeAccount2Instruction,
	decodeInitializeMintInstruction,
	decodeInitializeMint2Instruction,
	decodeInitializeMultisigInstruction,
	decodeSyncNativeInstruction,
	decodeInitializeMintCloseAuthorityInstruction,
	decodeInitializePermanentDelegateInstruction,
	decodeAmountToUiAmountInstruction,
	decodeUiAmountToAmountInstruction,
	// Transfer Fee extension decoders
	decodeInitializeTransferFeeConfigInstructionUnchecked,
	decodeTransferCheckedWithFeeInstructionUnchecked,
	decodeWithdrawWithheldTokensFromMintInstructionUnchecked,
	decodeWithdrawWithheldTokensFromAccountsInstructionUnchecked,
	decodeHarvestWithheldTokensToMintInstructionUnchecked,
	decodeSetTransferFeeInstructionUnchecked,
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
	// Use different labels for SPL Token v1 and Token-2022 for better UI compatibility
	const program =
		programId === TOKEN_PROGRAM_2022.toBase58()
			? "spl-token-2022"
			: "spl-token";
	return { program, programId, parsed: { type, info } };
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

		// MintTo
		try {
			const m = decodeMintToInstruction(ix, programPk);
			const amount = m.data.amount;
			return ok(programIdStr, "mintTo", {
				account: asBase58(m.keys.destination.pubkey),
				mint: asBase58(m.keys.mint.pubkey),
				mintAuthority: asBase58(m.keys.authority.pubkey),
				amount: typeof amount === "bigint" ? amount.toString() : String(amount),
			});
		} catch {}

		// Approve
		try {
			const a = decodeApproveInstruction(ix, programPk);
			const amount = a.data.amount;
			return ok(programIdStr, "approve", {
				source: asBase58(a.keys.account.pubkey),
				delegate: asBase58(a.keys.delegate.pubkey),
				owner: asBase58(a.keys.owner.pubkey),
				amount: typeof amount === "bigint" ? amount.toString() : String(amount),
			});
		} catch {}

		// ApproveChecked
		try {
			const a = decodeApproveCheckedInstruction(ix, programPk);
			const amount = a.data.amount;
			const decimals = a.data.decimals;
			return ok(programIdStr, "approveChecked", {
				source: asBase58(a.keys.account.pubkey),
				mint: asBase58(a.keys.mint.pubkey),
				delegate: asBase58(a.keys.delegate.pubkey),
				owner: asBase58(a.keys.owner.pubkey),
				tokenAmount: {
					amount:
						typeof amount === "bigint" ? amount.toString() : String(amount),
					decimals,
				},
			});
		} catch {}

		// Revoke
		try {
			const r = decodeRevokeInstruction(ix, programPk);
			return ok(programIdStr, "revoke", {
				source: asBase58(r.keys.account.pubkey),
				owner: asBase58(r.keys.owner.pubkey),
			});
		} catch {}

		// SetAuthority
		try {
			const s = decodeSetAuthorityInstruction(ix, programPk);
			const authorityTypeMap: Record<number, string> = {
				0: "mintTokens",
				1: "freezeAccount",
				2: "accountOwner",
				3: "closeAccount",
			};
			return ok(programIdStr, "setAuthority", {
				account: asBase58(s.keys.account.pubkey),
				currentAuthority: asBase58(s.keys.currentAuthority.pubkey),
				newAuthority: s.data.newAuthority
					? s.data.newAuthority.toBase58()
					: null,
				authorityType:
					authorityTypeMap[s.data.authorityType] ||
					String(s.data.authorityType),
			});
		} catch {}

		// Burn
		try {
			const b = decodeBurnInstruction(ix, programPk);
			const amount = b.data.amount;
			return ok(programIdStr, "burn", {
				account: asBase58(b.keys.account.pubkey),
				mint: asBase58(b.keys.mint.pubkey),
				authority: asBase58(b.keys.owner.pubkey),
				amount: typeof amount === "bigint" ? amount.toString() : String(amount),
			});
		} catch {}

		// BurnChecked
		try {
			const b = decodeBurnCheckedInstruction(ix, programPk);
			const amount = b.data.amount;
			const decimals = b.data.decimals;
			return ok(programIdStr, "burnChecked", {
				account: asBase58(b.keys.account.pubkey),
				mint: asBase58(b.keys.mint.pubkey),
				authority: asBase58(b.keys.owner.pubkey),
				tokenAmount: {
					amount:
						typeof amount === "bigint" ? amount.toString() : String(amount),
					decimals,
				},
			});
		} catch {}

		// CloseAccount
		try {
			const c = decodeCloseAccountInstruction(ix, programPk);
			return ok(programIdStr, "closeAccount", {
				account: asBase58(c.keys.account.pubkey),
				destination: asBase58(c.keys.destination.pubkey),
				owner: asBase58(c.keys.authority.pubkey),
			});
		} catch {}

		// FreezeAccount
		try {
			const f = decodeFreezeAccountInstruction(ix, programPk);
			return ok(programIdStr, "freezeAccount", {
				account: asBase58(f.keys.account.pubkey),
				mint: asBase58(f.keys.mint.pubkey),
				freezeAuthority: asBase58(f.keys.authority.pubkey),
			});
		} catch {}

		// ThawAccount
		try {
			const t = decodeThawAccountInstruction(ix, programPk);
			return ok(programIdStr, "thawAccount", {
				account: asBase58(t.keys.account.pubkey),
				mint: asBase58(t.keys.mint.pubkey),
				freezeAuthority: asBase58(t.keys.authority.pubkey),
			});
		} catch {}

		// InitializeAccount
		try {
			const i = decodeInitializeAccountInstruction(ix, programPk);
			return ok(programIdStr, "initializeAccount", {
				account: asBase58(i.keys.account.pubkey),
				mint: asBase58(i.keys.mint.pubkey),
				owner: asBase58(i.keys.owner.pubkey),
				rentSysvar: asBase58(i.keys.rent.pubkey),
			});
		} catch {}

		// InitializeAccount2
		try {
			const i = decodeInitializeAccount2Instruction(ix, programPk);
			return ok(programIdStr, "initializeAccount2", {
				account: asBase58(i.keys.account.pubkey),
				mint: asBase58(i.keys.mint.pubkey),
				owner: i.data.owner.toBase58(),
				rentSysvar: asBase58(i.keys.rent.pubkey),
			});
		} catch {}

		// InitializeMint
		try {
			const i = decodeInitializeMintInstruction(ix, programPk);
			return ok(programIdStr, "initializeMint", {
				mint: asBase58(i.keys.mint.pubkey),
				decimals: i.data.decimals,
				mintAuthority: i.data.mintAuthority.toBase58(),
				freezeAuthority: i.data.freezeAuthority
					? i.data.freezeAuthority.toBase58()
					: null,
				rentSysvar: asBase58(i.keys.rent.pubkey),
			});
		} catch {}

		// InitializeMint2
		try {
			const i = decodeInitializeMint2Instruction(ix, programPk);
			return ok(programIdStr, "initializeMint2", {
				mint: asBase58(i.keys.mint.pubkey),
				decimals: i.data.decimals,
				mintAuthority: i.data.mintAuthority.toBase58(),
				freezeAuthority: i.data.freezeAuthority
					? i.data.freezeAuthority.toBase58()
					: null,
			});
		} catch {}

		// InitializeMultisig
		try {
			const i = decodeInitializeMultisigInstruction(ix, programPk);
			return ok(programIdStr, "initializeMultisig", {
				account: asBase58(i.keys.account.pubkey),
				m: i.data.m,
				signers: i.keys.signers.map((s) => s.pubkey.toBase58()),
			});
		} catch {}

		// Note: InitializeMultisig2 doesn't have a decode function yet
		// It will be recognized by opcode fallback

		// SyncNative
		try {
			const s = decodeSyncNativeInstruction(ix, programPk);
			return ok(programIdStr, "syncNative", {
				account: asBase58(s.keys.account.pubkey),
			});
		} catch {}

		// InitializeMintCloseAuthority
		try {
			const i = decodeInitializeMintCloseAuthorityInstruction(ix, programPk);
			return ok(programIdStr, "initializeMintCloseAuthority", {
				mint: asBase58(i.keys.mint.pubkey),
				closeAuthority: i.data.closeAuthority
					? i.data.closeAuthority.toBase58()
					: null,
			});
		} catch {}

		// InitializePermanentDelegate
		try {
			const i = decodeInitializePermanentDelegateInstruction(ix, programPk);
			return ok(programIdStr, "initializePermanentDelegate", {
				mint: asBase58(i.keys.mint.pubkey),
				delegate: i.data.delegate.toBase58(),
			});
		} catch {}

		// Note: Reallocate and InitializeNonTransferableMint don't have decode functions
		// in @solana/spl-token yet. They will be recognized by opcode fallback below.

		// AmountToUiAmount
		try {
			const a = decodeAmountToUiAmountInstruction(ix, programPk);
			return ok(programIdStr, "amountToUiAmount", {
				mint: asBase58(a.keys.mint.pubkey),
				amount:
					typeof a.data.amount === "bigint"
						? a.data.amount.toString()
						: String(a.data.amount),
			});
		} catch {}

		// UiAmountToAmount
		try {
			const u = decodeUiAmountToAmountInstruction(ix, programPk);
			return ok(programIdStr, "uiAmountToAmount", {
				mint: asBase58(u.keys.mint.pubkey),
				uiAmount: u.data.amount,
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

		// Transfer Fee Extension (opcode 26) - Parse sub-instructions
		if (ix.data && ix.data.length > 1 && ix.data[0] === 26) {
			const subOp = ix.data[1];
			try {
				// InitializeTransferFeeConfig (sub-opcode 0)
				if (subOp === 0) {
					const decoded =
						decodeInitializeTransferFeeConfigInstructionUnchecked(ix);
					return ok(programIdStr, "initializeTransferFeeConfig", {
						mint: asBase58(decoded.keys.mint?.pubkey),
						transferFeeConfigAuthority: asBase58(
							decoded.data.transferFeeConfigAuthority || undefined,
						),
						withdrawWithheldAuthority: asBase58(
							decoded.data.withdrawWithheldAuthority || undefined,
						),
						transferFeeBasisPoints: decoded.data.transferFeeBasisPoints,
						maximumFee: decoded.data.maximumFee.toString(),
					});
				}
				// TransferCheckedWithFee (sub-opcode 1)
				if (subOp === 1) {
					const decoded = decodeTransferCheckedWithFeeInstructionUnchecked(ix);
					const amount = decoded.data.amount;
					const fee = decoded.data.fee;
					const decimals = decoded.data.decimals;
					const amtStr = amount.toString();
					const feeStr = fee.toString();
					const base = BigInt(10) ** BigInt(decimals);
					const whole = BigInt(amtStr) / base;
					const frac = BigInt(amtStr) % base;
					const fracStr = frac
						.toString()
						.padStart(decimals, "0")
						.replace(/0+$/, "");
					const uiStr = fracStr.length ? `${whole}.${fracStr}` : `${whole}`;
					return ok(programIdStr, "transferCheckedWithFee", {
						source: asBase58(decoded.keys.source.pubkey),
						mint: asBase58(decoded.keys.mint.pubkey),
						destination: asBase58(decoded.keys.destination.pubkey),
						authority: asBase58(decoded.keys.authority.pubkey),
						tokenAmount: {
							amount: amtStr,
							decimals,
							uiAmount: Number(uiStr),
							uiAmountString: uiStr,
						},
						fee: feeStr,
					});
				}
				// WithdrawWithheldTokensFromMint (sub-opcode 2)
				if (subOp === 2) {
					const decoded =
						decodeWithdrawWithheldTokensFromMintInstructionUnchecked(ix);
					return ok(programIdStr, "withdrawWithheldTokensFromMint", {
						mint: asBase58(decoded.keys.mint.pubkey),
						destination: asBase58(decoded.keys.destination.pubkey),
						authority: asBase58(decoded.keys.authority.pubkey),
					});
				}
				// WithdrawWithheldTokensFromAccounts (sub-opcode 3)
				if (subOp === 3) {
					const decoded =
						decodeWithdrawWithheldTokensFromAccountsInstructionUnchecked(ix);
					return ok(programIdStr, "withdrawWithheldTokensFromAccounts", {
						mint: asBase58(decoded.keys.mint.pubkey),
						destination: asBase58(decoded.keys.destination.pubkey),
						authority: asBase58(decoded.keys.authority.pubkey),
						numTokenAccounts: decoded.data.numTokenAccounts,
						sources: decoded.keys.sources?.map((k) => asBase58(k.pubkey)) || [],
					});
				}
				// HarvestWithheldTokensToMint (sub-opcode 4)
				if (subOp === 4) {
					const decoded =
						decodeHarvestWithheldTokensToMintInstructionUnchecked(ix);
					return ok(programIdStr, "harvestWithheldTokensToMint", {
						mint: asBase58(decoded.keys.mint.pubkey),
						sources: decoded.keys.sources?.map((k) => asBase58(k.pubkey)) || [],
					});
				}
				// SetTransferFee (sub-opcode 5)
				if (subOp === 5) {
					const decoded = decodeSetTransferFeeInstructionUnchecked(ix);
					return ok(programIdStr, "setTransferFee", {
						mint: asBase58(decoded.keys.mint.pubkey),
						authority: asBase58(decoded.keys.authority.pubkey),
						transferFeeBasisPoints: decoded.data.transferFeeBasisPoints,
						maximumFee: decoded.data.maximumFee.toString(),
					});
				}
			} catch {}
		}

		// Default Account State Extension (opcode 28) - Simple enable/disable
		if (ix.data && ix.data.length > 1 && ix.data[0] === 28) {
			const subOp = ix.data[1];
			try {
				if (subOp === 0) {
					// Initialize - has account state byte at position 2
					const accountState = ix.data[2]; // 0=Uninitialized, 1=Initialized, 2=Frozen
					const stateMap: Record<number, string> = {
						0: "uninitialized",
						1: "initialized",
						2: "frozen",
					};
					return ok(programIdStr, "initializeDefaultAccountState", {
						mint: asBase58(ix.keys[0]?.pubkey),
						accountState: stateMap[accountState] || String(accountState),
					});
				}
				if (subOp === 1) {
					// Update
					const accountState = ix.data[2];
					const stateMap: Record<number, string> = {
						0: "uninitialized",
						1: "initialized",
						2: "frozen",
					};
					return ok(programIdStr, "updateDefaultAccountState", {
						mint: asBase58(ix.keys[0]?.pubkey),
						freezeAuthority: asBase58(ix.keys[1]?.pubkey),
						accountState: stateMap[accountState] || String(accountState),
					});
				}
			} catch {}
		}

		// Memo Transfer Extension (opcode 30) - Simple enable/disable
		if (ix.data && ix.data.length > 1 && ix.data[0] === 30) {
			const subOp = ix.data[1];
			try {
				if (subOp === 0) {
					// Enable
					return ok(programIdStr, "enableRequiredMemoTransfers", {
						account: asBase58(ix.keys[0]?.pubkey),
						authority: asBase58(ix.keys[1]?.pubkey),
					});
				}
				if (subOp === 1) {
					// Disable
					return ok(programIdStr, "disableRequiredMemoTransfers", {
						account: asBase58(ix.keys[0]?.pubkey),
						authority: asBase58(ix.keys[1]?.pubkey),
					});
				}
			} catch {}
		}

		// CPI Guard Extension (opcode 34) - Simple enable/disable
		if (ix.data && ix.data.length > 1 && ix.data[0] === 34) {
			const subOp = ix.data[1];
			try {
				if (subOp === 0) {
					// Enable
					return ok(programIdStr, "enableCpiGuard", {
						account: asBase58(ix.keys[0]?.pubkey),
						authority: asBase58(ix.keys[1]?.pubkey),
					});
				}
				if (subOp === 1) {
					// Disable
					return ok(programIdStr, "disableCpiGuard", {
						account: asBase58(ix.keys[0]?.pubkey),
						authority: asBase58(ix.keys[1]?.pubkey),
					});
				}
			} catch {}
		}

		// Interest Bearing Mint Extension (opcode 33)
		if (ix.data && ix.data.length > 1 && ix.data[0] === 33) {
			const subOp = ix.data[1];
			try {
				if (subOp === 0) {
					return ok(programIdStr, "initializeInterestBearingMint", {
						mint: asBase58(ix.keys[0]?.pubkey),
						rateAuthority: asBase58(ix.keys[1]?.pubkey),
					});
				}
				if (subOp === 1) {
					return ok(programIdStr, "updateRateInterestBearingMint", {
						mint: asBase58(ix.keys[0]?.pubkey),
						rateAuthority: asBase58(ix.keys[1]?.pubkey),
					});
				}
			} catch {}
		}

		// Transfer Hook Extension (opcode 36)
		if (ix.data && ix.data.length > 1 && ix.data[0] === 36) {
			const subOp = ix.data[1];
			try {
				if (subOp === 0) {
					return ok(programIdStr, "initializeTransferHook", {
						mint: asBase58(ix.keys[0]?.pubkey),
					});
				}
				if (subOp === 1) {
					return ok(programIdStr, "updateTransferHook", {
						mint: asBase58(ix.keys[0]?.pubkey),
						authority: asBase58(ix.keys[1]?.pubkey),
					});
				}
			} catch {}
		}

		// Metadata Pointer Extension (opcode 39)
		if (ix.data && ix.data.length > 1 && ix.data[0] === 39) {
			const subOp = ix.data[1];
			try {
				if (subOp === 0) {
					return ok(programIdStr, "initializeMetadataPointer", {
						mint: asBase58(ix.keys[0]?.pubkey),
					});
				}
				if (subOp === 1) {
					return ok(programIdStr, "updateMetadataPointer", {
						mint: asBase58(ix.keys[0]?.pubkey),
						authority: asBase58(ix.keys[1]?.pubkey),
					});
				}
			} catch {}
		}

		// Group Pointer Extension (opcode 40)
		if (ix.data && ix.data.length > 1 && ix.data[0] === 40) {
			const subOp = ix.data[1];
			try {
				if (subOp === 0) {
					return ok(programIdStr, "initializeGroupPointer", {
						mint: asBase58(ix.keys[0]?.pubkey),
					});
				}
				if (subOp === 1) {
					return ok(programIdStr, "updateGroupPointer", {
						mint: asBase58(ix.keys[0]?.pubkey),
						authority: asBase58(ix.keys[1]?.pubkey),
					});
				}
			} catch {}
		}

		// Group Member Pointer Extension (opcode 41)
		if (ix.data && ix.data.length > 1 && ix.data[0] === 41) {
			const subOp = ix.data[1];
			try {
				if (subOp === 0) {
					return ok(programIdStr, "initializeGroupMemberPointer", {
						mint: asBase58(ix.keys[0]?.pubkey),
					});
				}
				if (subOp === 1) {
					return ok(programIdStr, "updateGroupMemberPointer", {
						mint: asBase58(ix.keys[0]?.pubkey),
						authority: asBase58(ix.keys[1]?.pubkey),
					});
				}
			} catch {}
		}

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
					// 26: handled by Transfer Fee Extension parser above
					27: "confidentialTransferExtension",
					// 28: handled by Default Account State Extension parser above
					29: "reallocate",
					// 30: handled by Memo Transfer Extension parser above
					31: "createNativeMint",
					32: "initializeNonTransferableMint",
					33: "interestBearingMintExtension",
					// 34: handled by CPI Guard Extension parser above
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
