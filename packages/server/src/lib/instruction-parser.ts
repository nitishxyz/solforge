import {
	AddressLookupTableInstruction,
	ComputeBudgetInstruction,
	PublicKey,
	StakeInstruction,
	SystemInstruction,
	SystemProgram,
	TransactionInstruction,
	VoteInstruction,
} from "@solana/web3.js";
import {
	TOKEN_PROGRAM_ID,
	ASSOCIATED_TOKEN_PROGRAM_ID,
	TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { tryParseSplToken } from "./parsers/spl-token";
import { tryParseAta } from "./parsers/spl-associated-token-account";
import { decodeBase58 as _decodeBase58 } from "./base58";

export type ParsedInstruction =
	| {
			program: string;
			programId: string;
			parsed: { type: string; info: unknown };
	  }
	| { programId: string; accounts: string[]; data: string };

function makeIx(
	programId: string,
	accountKeys: string[],
	accounts: number[],
	dataBase58: string,
): TransactionInstruction {
	const keys = accounts.map((i) => ({
		pubkey: new PublicKey(accountKeys[i] || SystemProgram.programId),
		isSigner: false,
		isWritable: false,
	}));
	const data = Buffer.from(_decodeBase58(dataBase58));
	return new TransactionInstruction({
		programId: new PublicKey(programId),
		keys,
		data,
	});
}

function ok(
	program: string,
	programId: string,
	type: string,
	info: unknown,
): ParsedInstruction {
	return { program, programId, parsed: { type, info } };
}

export function parseInstruction(
    programId: string,
    accounts: number[],
    dataBase58: string,
    accountKeys: string[],
    tokenBalanceHints?: Array<{ mint: string; decimals: number }>,
): ParsedInstruction {
	try {
		const pid = new PublicKey(programId);
		const ix = makeIx(programId, accountKeys, accounts, dataBase58);

		// SPL Token (legacy) and Token-2022
        if (pid.equals(TOKEN_PROGRAM_ID) || pid.equals(TOKEN_2022_PROGRAM_ID)) {
            const parsed = tryParseSplToken(
                ix,
                programId,
                accountKeys,
                dataBase58,
                tokenBalanceHints,
            );
            if (parsed) return parsed;
        }

		// Associated Token Account
		if (pid.equals(ASSOCIATED_TOKEN_PROGRAM_ID)) {
			const parsed = tryParseAta(ix, programId);
			if (parsed) return parsed;
		}

		// System Program
		if (pid.equals(SystemProgram.programId)) {
			try {
				const t = SystemInstruction.decodeInstructionType(ix);
				switch (t) {
					case "Create": {
						try {
							const p = SystemInstruction.decodeCreateAccount(ix);
							const from = p.fromPubkey.toBase58();
							const newAcc = p.newAccountPubkey.toBase58();
							const owner = p.programId.toBase58();
							return ok("system", programId, "createAccount", {
								// Explorer-compatible field names
								source: from,
								newAccount: newAcc,
								owner,
								lamports: Number(p.lamports),
								space: Number(p.space),
								// Keep legacy aliases too
								fromPubkey: from,
								newAccountPubkey: newAcc,
								programId: owner,
							});
						} catch {
							return ok("system", programId, "createAccount", {});
						}
					}
					case "Transfer": {
						try {
							const p = SystemInstruction.decodeTransfer(ix);
							return ok("system", programId, "transfer", {
								source: p.fromPubkey.toBase58(),
								destination: p.toPubkey.toBase58(),
								lamports: Number(p.lamports),
							});
						} catch {
							return ok("system", programId, "transfer", {});
						}
					}
					case "TransferWithSeed": {
						try {
							const p = SystemInstruction.decodeTransferWithSeed(ix);
							return ok("system", programId, "transferWithSeed", {
								fromPubkey: p.fromPubkey.toBase58(),
								basePubkey: p.basePubkey.toBase58(),
								toPubkey: p.toPubkey.toBase58(),
								lamports: Number(p.lamports),
								seed: p.seed,
								programId: p.programId.toBase58(),
							});
						} catch {
							return ok("system", programId, "transferWithSeed", {});
						}
					}
					case "Allocate": {
						try {
							const p = SystemInstruction.decodeAllocate(ix);
							return ok("system", programId, "allocate", {
								accountPubkey: p.accountPubkey.toBase58(),
								space: Number(p.space),
							});
						} catch {
							return ok("system", programId, "allocate", {});
						}
					}
					case "AllocateWithSeed": {
						try {
							const p = SystemInstruction.decodeAllocateWithSeed(ix);
							return ok("system", programId, "allocateWithSeed", {
								accountPubkey: p.accountPubkey.toBase58(),
								basePubkey: p.basePubkey.toBase58(),
								seed: p.seed,
								space: Number(p.space),
								programId: p.programId.toBase58(),
							});
						} catch {
							return ok("system", programId, "allocateWithSeed", {});
						}
					}
					case "Assign": {
						try {
							const p = SystemInstruction.decodeAssign(ix);
							return ok("system", programId, "assign", {
								accountPubkey: p.accountPubkey.toBase58(),
								programId: p.programId.toBase58(),
							});
						} catch {
							return ok("system", programId, "assign", {});
						}
					}
					case "AssignWithSeed": {
						try {
							const p = SystemInstruction.decodeAssignWithSeed(ix);
							return ok("system", programId, "assignWithSeed", {
								accountPubkey: p.accountPubkey.toBase58(),
								basePubkey: p.basePubkey.toBase58(),
								seed: p.seed,
								programId: p.programId.toBase58(),
							});
						} catch {
							return ok("system", programId, "assignWithSeed", {});
						}
					}
					case "InitializeNonceAccount":
					case "AdvanceNonceAccount":
					case "WithdrawNonceAccount":
					case "AuthorizeNonceAccount":
					case "CreateWithSeed":
					case "UpgradeNonceAccount": {
						return ok("system", programId, t, {});
					}
					default:
						return ok("system", programId, t, {});
				}
			} catch {
				// If we cannot even decode the instruction type, fallthrough to raw
			}
		}

		// Compute Budget
		try {
			const t = ComputeBudgetInstruction.decodeInstructionType(ix);
			switch (t) {
				case "SetComputeUnitLimit": {
					const p = ComputeBudgetInstruction.decodeSetComputeUnitLimit(ix);
					return ok("computeBudget", programId, "setComputeUnitLimit", {
						units: Number(p.units),
					});
				}
				case "SetComputeUnitPrice": {
					const p = ComputeBudgetInstruction.decodeSetComputeUnitPrice(ix);
					return ok("computeBudget", programId, "setComputeUnitPrice", {
						microLamports: Number(p.microLamports),
					});
				}
				case "RequestHeapFrame": {
					const p = ComputeBudgetInstruction.decodeRequestHeapFrame(ix);
					return ok("computeBudget", programId, "requestHeapFrame", {
						bytes: Number(p.bytes),
					});
				}
				case "RequestUnits": {
					const p = ComputeBudgetInstruction.decodeRequestUnits(ix);
					return ok("computeBudget", programId, "requestUnits", {
						units: Number(p.units),
						additionalFee: Number(p.additionalFee),
					});
				}
			}
		} catch {}

		// Stake
		try {
			const t = StakeInstruction.decodeInstructionType(ix);
			switch (t) {
				case "Initialize":
					return ok("stake", programId, "initialize", {});
				case "Delegate": {
					const p = StakeInstruction.decodeDelegate(ix);
					return ok("stake", programId, "delegate", {
						stakePubkey: p.stakePubkey.toBase58(),
						votePubkey: p.votePubkey.toBase58(),
						authorizedPubkey: p.authorizedPubkey.toBase58(),
					});
				}
				case "Authorize": {
					const p = StakeInstruction.decodeAuthorize(ix);
					return ok("stake", programId, "authorize", {
						stakePubkey: p.stakePubkey.toBase58(),
						authorizedPubkey: p.authorizedPubkey.toBase58(),
						newAuthorizedPubkey: p.newAuthorizedPubkey.toBase58(),
						stakeAuthorizationType: p.stakeAuthorizationType.index,
					});
				}
				case "AuthorizeWithSeed":
					return ok("stake", programId, "authorizeWithSeed", {});
				case "Split":
					return ok("stake", programId, "split", {});
				case "Withdraw":
					return ok("stake", programId, "withdraw", {});
				case "Deactivate":
					return ok("stake", programId, "deactivate", {});
				case "Merge":
					return ok("stake", programId, "merge", {});
			}
		} catch {}

		// Vote
		try {
			const t = VoteInstruction.decodeInstructionType(ix);
			switch (t) {
				case "InitializeAccount":
					return ok("vote", programId, "initialize", {});
				case "Authorize":
					return ok("vote", programId, "authorize", {});
				case "AuthorizeWithSeed":
					return ok("vote", programId, "authorizeWithSeed", {});
				case "Withdraw":
					return ok("vote", programId, "withdraw", {});
				default:
					return ok("vote", programId, t, {});
			}
		} catch {}

		// Address Lookup Table
		try {
			const t = AddressLookupTableInstruction.decodeInstructionType(ix);
			switch (t) {
				case "CreateLookupTable":
				case "ExtendLookupTable":
				case "CloseLookupTable":
				case "FreezeLookupTable":
				case "DeactivateLookupTable":
					return ok("address-lookup-table", programId, t, {});
			}
		} catch {}

		// Memo program: parse utf8 memo if possible
		if (
			programId === "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr" ||
			programId === "Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo"
		) {
			try {
				const bytes = _decodeBase58(dataBase58);
				const memo = new TextDecoder().decode(bytes);
				return ok("spl-memo", programId, "memo", { memo });
			} catch {}
			return ok("spl-memo", programId, "memo", {});
		}

		// Fallback: unknown program, return raw
		return {
			programId,
			accounts: accounts.map((i) => accountKeys[i] || ""),
			data: dataBase58,
		};
	} catch {
		return {
			programId,
			accounts: accounts.map((i) => accountKeys[i] || ""),
			data: dataBase58,
		};
	}
}
