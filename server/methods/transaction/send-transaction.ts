import {
	ACCOUNT_SIZE,
	AccountLayout,
	MINT_SIZE,
	MintLayout,
	TOKEN_2022_PROGRAM_ID,
	TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import type { RpcMethodHandler } from "../../types";

export const sendTransaction: RpcMethodHandler = (id, params, context) => {
	const [encodedTx] = params;
	try {
		const txData = Buffer.from(encodedTx, "base64");
		const tx = VersionedTransaction.deserialize(txData);

		// Snapshot pre balances
		const msg = tx.message as unknown as {
			staticAccountKeys?: unknown[];
			accountKeys?: unknown[];
		};
		const rawKeys: unknown[] = Array.isArray(msg.staticAccountKeys)
			? msg.staticAccountKeys
			: Array.isArray(msg.accountKeys)
				? msg.accountKeys
				: [];
        const staticKeys = rawKeys
            .map((k) => {
                try {
                    return typeof k === "string" ? new PublicKey(k) : (k as PublicKey);
                } catch {
                    return undefined;
                }
            })
            .filter(Boolean) as PublicKey[];
        // Pre snapshots and balances
        const preBalances = staticKeys.map((pk) => {
            try {
                return Number(context.svm.getBalance(pk));
            } catch {
                return 0;
            }
        });
        const preAccountStates = staticKeys.map((pk) => {
            try {
                const addr = pk.toBase58();
                const acc = context.svm.getAccount(pk);
                if (!acc) return { address: addr, pre: null } as const;
                return {
                    address: addr,
                    pre: {
                        lamports: Number(acc.lamports || 0n),
                        ownerProgram: new PublicKey(acc.owner).toBase58(),
                        executable: !!acc.executable,
                        rentEpoch: Number(acc.rentEpoch || 0),
                        dataLen: acc.data?.length ?? 0,
                        dataBase64: undefined,
                        lastSlot: Number(context.slot),
                    },
                } as const;
            } catch {
                return { address: pk.toBase58(), pre: null } as const;
            }
        });
        try {
            if (process.env.DEBUG_TX_CAPTURE === "1") {
                console.debug(
                    `[tx-capture] pre snapshots: keys=${staticKeys.length} captured=${preAccountStates.length}`,
                );
            }
        } catch {}

		// Collect SPL token accounts from instructions for pre/post token balance snapshots
		const msgAny = msg as unknown as {
			compiledInstructions?: unknown[];
			instructions?: unknown[];
		};
		const compiled: unknown[] = Array.isArray(msgAny.compiledInstructions)
			? msgAny.compiledInstructions
			: Array.isArray(msgAny.instructions)
				? msgAny.instructions
				: [];
		const tokenProgramIds = new Set([
			TOKEN_PROGRAM_ID.toBase58(),
			TOKEN_2022_PROGRAM_ID.toBase58(),
		]);
		const tokenAccountSet = new Set<string>();
		for (const ci of compiled) {
			try {
				const pid = staticKeys[ci.programIdIndex]?.toBase58();
				if (!pid || !tokenProgramIds.has(pid)) continue;
				const accIdxs: number[] = Array.isArray(ci.accountKeyIndexes)
					? ci.accountKeyIndexes
					: Array.isArray(ci.accounts)
						? ci.accounts
						: [];
				for (const ix of accIdxs) {
					const addr = staticKeys[ix]?.toBase58();
					if (addr) tokenAccountSet.add(addr);
				}
			} catch {}
		}
		// Pre token balances
		const preTokenBalances: unknown[] = [];
		const ataToInfo = new Map<
			string,
			{
				mint?: string;
				owner?: string;
				amount: bigint;
				accountIndex: number;
				decimals?: number;
			}
		>();
		const missingPre = new Set<string>();
		for (const addr of tokenAccountSet) {
			try {
				const pk = new PublicKey(addr);
				const idx = staticKeys.findIndex((k) => k.equals(pk));
				const acc = context.svm.getAccount(pk);
				if (!acc || (acc.data?.length ?? 0) < ACCOUNT_SIZE) {
					// Track placeholder; we'll fill mint/owner/decimals after send
					ataToInfo.set(addr, { amount: 0n, accountIndex: idx >= 0 ? idx : 0 });
					missingPre.add(addr);
					continue;
				}
				const decAcc = AccountLayout.decode(Buffer.from(acc.data));
				const mintPk = new PublicKey(decAcc.mint);
				const mintAcc = context.svm.getAccount(mintPk);
				let decimals = 0;
				if (mintAcc && (mintAcc.data?.length ?? 0) >= MINT_SIZE) {
					const m = MintLayout.decode(
						Buffer.from(mintAcc.data).slice(0, MINT_SIZE),
					);
					decimals = Number(m.decimals ?? 0);
				}
				const ownerPk = new PublicKey(decAcc.owner);
				const amt = BigInt(decAcc.amount.toString());
				ataToInfo.set(addr, {
					mint: mintPk.toBase58(),
					owner: ownerPk.toBase58(),
					amount: amt,
					accountIndex: idx >= 0 ? idx : 0,
					decimals,
				});
				const uiAmount = Number(amt) / 10 ** decimals;
				preTokenBalances.push({
					accountIndex: idx >= 0 ? idx : 0,
					mint: mintPk.toBase58(),
					owner: ownerPk.toBase58(),
					uiTokenAmount: {
						amount: amt.toString(),
						decimals,
						uiAmount,
						uiAmountString: String(uiAmount),
					},
				});
			} catch {}
		}

        const result = context.svm.sendTransaction(tx);

		try {
			const rawErr = (result as { err?: unknown }).err;
			const maybeErr =
				typeof rawErr === "function" ? (rawErr as () => unknown)() : rawErr;
			if (maybeErr) {
				return context.createErrorResponse(
					id,
					-32003,
					"Transaction failed",
					maybeErr,
				);
			}
		} catch {}

        const signature = tx.signatures[0]
            ? context.encodeBase58(tx.signatures[0])
            : context.encodeBase58(new Uint8Array(64).fill(0));
        context.notifySignature(signature);
        // Snapshot post balances and capture logs for rich view
        const postBalances = staticKeys.map((pk) => {
            try {
                return Number(context.svm.getBalance(pk));
            } catch {
                return 0;
            }
        });
        const postAccountStates = staticKeys.map((pk) => {
            try {
                const addr = pk.toBase58();
                const acc = context.svm.getAccount(pk);
                if (!acc) return { address: addr, post: null } as const;
                return {
                    address: addr,
                    post: {
                        lamports: Number(acc.lamports || 0n),
                        ownerProgram: new PublicKey(acc.owner).toBase58(),
                        executable: !!acc.executable,
                        rentEpoch: Number(acc.rentEpoch || 0),
                        dataLen: acc.data?.length ?? 0,
                        dataBase64: undefined,
                        lastSlot: Number(context.slot),
                    },
                } as const;
            } catch {
                return { address: pk.toBase58(), post: null } as const;
            }
        });
        try {
            if (process.env.DEBUG_TX_CAPTURE === "1") {
                console.debug(
                    `[tx-capture] post snapshots: keys=${staticKeys.length} captured=${postAccountStates.length}`,
                );
            }
        } catch {}
		// Post token balances
		const postTokenBalances: unknown[] = [];
		for (const addr of tokenAccountSet) {
			try {
				const pk = new PublicKey(addr);
				const idx = staticKeys.findIndex((k) => k.equals(pk));
				const acc = context.svm.getAccount(pk);
				if (!acc || (acc.data?.length ?? 0) < ACCOUNT_SIZE) continue;
				const decAcc = AccountLayout.decode(Buffer.from(acc.data));
				const mintPk = new PublicKey(decAcc.mint);
				const ownerPk = new PublicKey(decAcc.owner);
				const mintAcc = context.svm.getAccount(mintPk);
				let decimals = 0;
				if (mintAcc && (mintAcc.data?.length ?? 0) >= MINT_SIZE) {
					const m = MintLayout.decode(
						Buffer.from(mintAcc.data).slice(0, MINT_SIZE),
					);
					decimals = Number(m.decimals ?? 0);
				}
				const amt = BigInt(decAcc.amount.toString());
				const uiAmount = Number(amt) / 10 ** decimals;
				postTokenBalances.push({
					accountIndex:
						idx >= 0 ? idx : (ataToInfo.get(addr)?.accountIndex ?? 0),
					mint: mintPk.toBase58(),
					owner: ownerPk.toBase58(),
					uiTokenAmount: {
						amount: amt.toString(),
						decimals,
						uiAmount,
						uiAmountString: String(uiAmount),
					},
				});
				// Add missing pre entry as zero if account was unfunded before
				if (missingPre.has(addr)) {
					const preUi = 0;
					preTokenBalances.push({
						accountIndex:
							idx >= 0 ? idx : (ataToInfo.get(addr)?.accountIndex ?? 0),
						mint: mintPk.toBase58(),
						owner: ownerPk.toBase58(),
						uiTokenAmount: {
							amount: "0",
							decimals,
							uiAmount: preUi,
							uiAmountString: String(preUi),
						},
					});
				}
			} catch {}
		}
        let logs: string[] = [];
        let innerInstructions: unknown[] = [];
        let computeUnits: number | null = null;
        let returnData: { programId: string; dataBase64: string } | null = null;
        try {
            const DBG = process.env.DEBUG_TX_CAPTURE === "1";
            const r: any = result as any;
            // Logs can be on TransactionMetadata or in meta() for failures
            try {
                if (typeof r?.logs === "function") logs = r.logs();
            } catch {}
            let metaObj: any | undefined;
            // Success shape: methods on result
            if (
                typeof r?.innerInstructions === "function" ||
                typeof r?.computeUnitsConsumed === "function" ||
                typeof r?.returnData === "function"
            ) {
                metaObj = r;
            }
            // Failed shape: meta() returns TransactionMetadata
            if (!metaObj && typeof r?.meta === "function") {
                try {
                    metaObj = r.meta();
                    if (!logs.length && typeof metaObj?.logs === "function") {
                        logs = metaObj.logs();
                    }
                } catch (e) {
                    if (DBG)
                        console.debug("[tx-capture] meta() threw while extracting:", e);
                }
            }
            // Extract richer metadata from whichever object exposes it
            if (metaObj) {
                try {
                    const inner = metaObj.innerInstructions?.();
                    if (Array.isArray(inner)) {
                        innerInstructions = inner.map((group: any, index: number) => {
                            const instructions = Array.isArray(group)
                                ? group
                                      .map((ii: any) => {
                                          try {
                                              const inst = ii.instruction?.();
                                              const accIdxs: number[] = Array.from(
                                                  inst?.accounts?.() || [],
                                              );
                                              const dataBytes: Uint8Array =
                                                  inst?.data?.() || new Uint8Array();
                                              return {
                                                  programIdIndex: Number(
                                                      inst?.programIdIndex?.() ?? 0,
                                                  ),
                                                  accounts: accIdxs,
                                                  data: context.encodeBase58(dataBytes),
                                                  stackHeight: Number(ii.stackHeight?.() ?? 0),
                                              };
                                          } catch {
                                              return null;
                                          }
                                      })
                                      .filter(Boolean)
                                : [];
                            return { index, instructions };
                        });
                    }
                } catch (e) {
                    if (DBG)
                        console.debug(
                            "[tx-capture] innerInstructions extraction failed:",
                            e,
                        );
                }
                try {
                    const cu = metaObj.computeUnitsConsumed?.();
                    if (typeof cu === "bigint") computeUnits = Number(cu);
                } catch (e) {
                    if (DBG)
                        console.debug(
                            "[tx-capture] computeUnitsConsumed extraction failed:",
                            e,
                        );
                }
                try {
                    const rd = metaObj.returnData?.();
                    if (rd) {
                        const pid = new PublicKey(rd.programId()).toBase58();
                        const dataB64 = Buffer.from(rd.data()).toString("base64");
                        returnData = { programId: pid, dataBase64: dataB64 };
                    }
                } catch (e) {
                    if (DBG)
                        console.debug(
                            "[tx-capture] returnData extraction failed:",
                            e,
                        );
                }
            } else if (DBG) {
                console.debug(
                    "[tx-capture] no metadata object found on result shape",
                );
            }
        } catch {}
        try {
            if (process.env.DEBUG_TX_CAPTURE === "1") {
                console.debug(
                    `[tx-capture] sendTransaction meta: logs=${logs.length} innerGroups=${Array.isArray(innerInstructions) ? innerInstructions.length : 0} computeUnits=${computeUnits} returnData=${returnData ? "yes" : "no"}`,
                );
            }
        } catch {}
        context.recordTransaction(signature, tx, {
            logs,
            fee: 5000,
            blockTime: Math.floor(Date.now() / 1000),
            preBalances,
            postBalances,
            preTokenBalances,
            postTokenBalances,
            innerInstructions,
            computeUnits,
            returnData,
            accountStates: (() => {
                try {
                    const byAddr = new Map<string, { pre?: any; post?: any }>();
                    for (const s of preAccountStates)
                        byAddr.set(s.address, { pre: s.pre || null });
                    for (const s of postAccountStates) {
                        const e = byAddr.get(s.address) || {};
                        e.post = s.post || null;
                        byAddr.set(s.address, e);
                    }
                    return Array.from(byAddr.entries()).map(([address, v]) => ({
                        address,
                        pre: v.pre || null,
                        post: v.post || null,
                    }));
                } catch {
                    return [] as Array<{
                        address: string;
                        pre?: unknown;
                        post?: unknown;
                    }>;
                }
            })(),
        });

		return context.createSuccessResponse(id, signature);
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		return context.createErrorResponse(
			id,
			-32003,
			"Transaction failed",
			message,
		);
	}
};
