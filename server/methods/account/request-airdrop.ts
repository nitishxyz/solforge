import {
	PublicKey,
	SystemProgram,
	TransactionInstruction,
	TransactionMessage,
	VersionedTransaction,
} from "@solana/web3.js";
import type { RpcMethodHandler } from "../../types";

/**
 * Implements the requestAirdrop RPC method
 * @see https://docs.solana.com/api/http#requestairdrop
 */
export const requestAirdrop: RpcMethodHandler = (id, params, context) => {
	const [pubkeyStr, lamports, _config] = params || [];

	try {
		const toPubkey = new PublicKey(pubkeyStr);
		const faucet = context.getFaucet();
		// Use SVM's latest blockhash; uniqueness ensured via memo nonce
		let recentBlockhash: string | undefined;
		try {
			recentBlockhash = context.svm.latestBlockhash();
		} catch {}
		if (!recentBlockhash) {
			const bh = new Uint8Array(32);
			crypto.getRandomValues(bh);
			recentBlockhash = context.encodeBase58(bh);
		}

		// No per-request top-up; faucet is funded heavily at startup

		const ix = SystemProgram.transfer({
			fromPubkey: faucet.publicKey,
			toPubkey,
			lamports: Number(BigInt(lamports)),
		});
		// Add a memo with random nonce to guarantee unique signatures
		const memoProgramId = new PublicKey(
			"MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
		);
		const nonce = new Uint8Array(8);
		crypto.getRandomValues(nonce);
		const memoIx = new TransactionInstruction({
			keys: [],
			programId: memoProgramId,
			data: Buffer.from(`airdrop:${Buffer.from(nonce).toString("hex")}`),
		});

		const messageV0 = new TransactionMessage({
			payerKey: faucet.publicKey,
			recentBlockhash,
			instructions: [ix, memoIx],
		});
		// Prefer legacy message for maximum LiteSVM compatibility
		const compiled = messageV0.compileToLegacyMessage();

		const tx = new VersionedTransaction(compiled);
		tx.sign([faucet]);

		// Compute pre balances for all static account keys
		const msg = tx.message as unknown as {
			staticAccountKeys?: unknown;
			accountKeys?: unknown;
		};
		const rawKeys = Array.isArray(msg.staticAccountKeys)
			? (msg.staticAccountKeys as unknown[])
			: Array.isArray(msg.accountKeys)
				? (msg.accountKeys as unknown[])
				: [];
        const staticKeys = rawKeys.map((k) => {
            try {
                return typeof k === "string" ? new PublicKey(k) : (k as PublicKey);
            } catch {
                return faucet.publicKey;
            }
        });
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
		const toIndex = staticKeys.findIndex((pk) => pk.equals(toPubkey));
		const beforeTo =
			toIndex >= 0
				? preBalances[toIndex]
				: (() => {
						try {
							return Number(context.svm.getBalance(toPubkey));
						} catch {
							return 0;
						}
					})();

		const sendResult = context.svm.sendTransaction(tx);
		// Surface errors to aid debugging
		try {
			const rawErr = (sendResult as { err?: unknown }).err;
			const maybeErr =
				typeof rawErr === "function" ? (rawErr as () => unknown)() : rawErr;
			if (maybeErr) {
				let logsForErr: string[] = [];
				try {
					const sr = sendResult as {
						logs?: () => string[];
						meta?: () => { logs?: () => string[] } | undefined;
					};
					if (typeof sr?.logs === "function") logsForErr = sr.logs();
					else if (typeof sr?.meta === "function") {
						const m = sr.meta();
						const lg = m?.logs;
						if (typeof lg === "function") logsForErr = lg();
					}
				} catch {}
				console.warn(
					"[requestAirdrop] transfer failed. err=",
					maybeErr,
					" logs=\n",
					logsForErr.join("\n"),
				);
			}
		} catch {}

		let signature = tx.signatures[0]
			? context.encodeBase58(tx.signatures[0])
			: context.encodeBase58(new Uint8Array(64).fill(0));
		context.notifySignature(signature);
        // Compute post balances and capture logs if available for explorer detail view
        let postBalances = staticKeys.map((pk) => {
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
        let logs: string[] = [];
        let innerInstructions: unknown[] = [];
        let computeUnits: number | null = null;
        let returnData: { programId: string; dataBase64: string } | null = null;
        try {
            const DBG = process.env.DEBUG_TX_CAPTURE === "1";
            const r: any = sendResult as any;
            try {
                if (typeof r?.logs === "function") logs = r.logs();
            } catch {}
            let metaObj: any | undefined;
            if (
                typeof r?.innerInstructions === "function" ||
                typeof r?.computeUnitsConsumed === "function" ||
                typeof r?.returnData === "function"
            ) {
                metaObj = r;
            }
            if (!metaObj && typeof r?.meta === "function") {
                try {
                    metaObj = r.meta();
                    if (!logs.length && typeof metaObj?.logs === "function")
                        logs = metaObj.logs();
                } catch (e) {
                    if (DBG)
                        console.debug("[tx-capture] meta() threw while extracting:", e);
                }
            }
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
                    `[tx-capture] requestAirdrop meta: logs=${logs.length} innerGroups=${Array.isArray(innerInstructions) ? innerInstructions.length : 0} computeUnits=${computeUnits} returnData=${returnData ? "yes" : "no"}`,
                );
            }
        } catch {}
		// Verify recipient received lamports; retry once if not
		const afterTo =
			toIndex >= 0
				? postBalances[toIndex]
				: (() => {
						try {
							return Number(context.svm.getBalance(toPubkey));
						} catch {
							return 0;
						}
					})();
		const expectedDelta = Number(BigInt(lamports));
		if (afterTo - beforeTo < expectedDelta) {
			// Retry once with fresh blockhash + memo
			try {
				const bh2 = new Uint8Array(32);
				crypto.getRandomValues(bh2);
				const rb2 = context.encodeBase58(bh2);
				const memoProgramId2 = new PublicKey(
					"MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
				);
				const nonce2 = new Uint8Array(8);
				crypto.getRandomValues(nonce2);
				const memoIx2 = new TransactionInstruction({
					keys: [],
					programId: memoProgramId2,
					data: Buffer.from(
						`airdrop-retry:${Buffer.from(nonce2).toString("hex")}`,
					),
				});
				const msg2 = new TransactionMessage({
					payerKey: faucet.publicKey,
					recentBlockhash: rb2,
					instructions: [ix, memoIx2],
				}).compileToV0Message();
				const tx2 = new VersionedTransaction(msg2);
				tx2.sign([faucet]);
				const res2 = context.svm.sendTransaction(tx2);
				try {
					const e2Raw = (res2 as { err?: unknown }).err;
					const e2 =
						typeof e2Raw === "function" ? (e2Raw as () => unknown)() : e2Raw;
					if (e2) console.warn("[requestAirdrop] retry failed:", e2);
				} catch {}
				signature = tx2.signatures[0]
					? context.encodeBase58(tx2.signatures[0])
					: signature;
				context.notifySignature(signature);
				postBalances = staticKeys.map((pk) => {
					try {
						return Number(context.svm.getBalance(pk));
					} catch {
						return 0;
					}
				});
			} catch {}
		}

		// Try to capture error again for accurate status reporting
		let recErr: unknown = null;
		try {
			const rawErrFun = (sendResult as { err?: unknown }).err;
			recErr =
				typeof rawErrFun === "function"
					? (rawErrFun as () => unknown)()
					: rawErrFun;
		} catch {}
        context.recordTransaction(signature, tx, {
            logs,
            fee: 5000,
            blockTime: Math.floor(Date.now() / 1000),
            preBalances,
            postBalances,
            err: recErr,
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
		return context.createErrorResponse(id, -32602, "Invalid params", message);
	}
};
