import { VersionedTransaction } from "@solana/web3.js";
import type { RpcMethodHandler } from "../../types";
import { parseInstruction } from "../../lib/instruction-parser";

export const getTransaction: RpcMethodHandler = async (id, params, context) => {
	const [signature, config] = params || [];
	const encoding = config?.encoding ?? "json";
	const DBG = process.env.DEBUG_TX_CAPTURE === "1";
	try {
		if (DBG)
			console.debug(
				`[tx-capture] getTransaction request: sig=${signature} enc=${encoding}`,
			);
	} catch {}

	try {
		const rec = context.getRecordedTransaction(signature);
		if (rec) {
			try {
				if (DBG) {
					const innerLen = (() => {
						try {
							const v = (rec as unknown as { innerInstructions?: unknown })
								.innerInstructions;
							return Array.isArray(v) ? v.length : 0;
						} catch {
							return 0;
						}
					})();
					console.debug(
						`[tx-capture] getTransaction hit memory: logs=${rec.logs?.length || 0} inner=${innerLen}`,
					);
				}
			} catch {}
			const tx = rec.tx;
			if (encoding === "base64") {
				const raw = Buffer.from(tx.serialize()).toString("base64");
				// Top-level version is required by some clients
				const isV0 = (() => {
					const m = tx.message as unknown as { version?: number };
					return typeof m?.version === "number" ? m.version === 0 : true;
				})();
				return context.createSuccessResponse(id, {
					slot: rec.slot,
					transaction: [raw, "base64"],
					version: isV0 ? 0 : "legacy",
					meta: {
						status: rec.err ? { Err: rec.err } : { Ok: null },
						err: rec.err ?? null,
						fee: rec.fee,
						loadedAddresses: { writable: [], readonly: [] },
						preBalances: Array.isArray(rec.preBalances) ? rec.preBalances : [],
						postBalances: Array.isArray(rec.postBalances)
							? rec.postBalances
							: [],
						innerInstructions: Array.isArray(rec.innerInstructions)
							? rec.innerInstructions
							: [],
						logMessages: rec.logs || [],
						preTokenBalances: (() => {
							const arr = (rec as unknown as { preTokenBalances?: unknown[] })
								.preTokenBalances;
							return Array.isArray(arr) ? arr : [];
						})(),
						postTokenBalances: (() => {
							const arr = (rec as unknown as { postTokenBalances?: unknown[] })
								.postTokenBalances;
							return Array.isArray(arr) ? arr : [];
						})(),
						computeUnitsConsumed:
							typeof rec.computeUnits === "number" ? rec.computeUnits : null,
						returnData: (() => {
							const rd = rec.returnData as
								| { programId: string; dataBase64: string }
								| null
								| undefined;
							if (!rd) return null;
							return {
								programId: rd.programId,
								data: [rd.dataBase64, "base64"],
							};
						})(),
						rewards: [],
					},
					blockTime: rec.blockTime,
				});
			}

			const msg = tx.message as unknown as {
				staticAccountKeys?: unknown[];
				accountKeys?: unknown[];
				compiledInstructions?: unknown[];
				instructions?: unknown[];
				header?: unknown;
				recentBlockhash?: string;
				version?: number;
				addressTableLookups?: unknown[];
				isAccountSigner?: (i: number) => boolean;
				isAccountWritable?: (i: number) => boolean;
			};
			const rawKeys1: unknown[] = Array.isArray(msg.staticAccountKeys)
				? msg.staticAccountKeys
				: Array.isArray(msg.accountKeys)
					? msg.accountKeys
					: [];
			const accountKeys = rawKeys1.map((k) => {
				try {
					return typeof k === "string"
						? k
						: (k as { toBase58: () => string }).toBase58();
				} catch {
					return String(k);
				}
			});
			const compiled: unknown[] = Array.isArray(msg.compiledInstructions)
				? msg.compiledInstructions
				: Array.isArray(msg.instructions)
					? msg.instructions
					: [];
			const instructions = compiled.map((ci) => {
				const c = ci as {
					programIdIndex: number;
					accountKeyIndexes?: number[];
					accounts?: number[];
					data: Uint8Array | number[];
				};
				const dataBytes: Uint8Array =
					c.data instanceof Uint8Array ? c.data : Buffer.from(c.data);
				return {
					programIdIndex: c.programIdIndex,
					accounts: Array.from(c.accountKeyIndexes || c.accounts || []),
					data: context.encodeBase58(dataBytes),
				};
			});
			const addressTableLookups = (
				Array.isArray(msg.addressTableLookups) ? msg.addressTableLookups : []
			).map((l) => {
				const a = l as {
					accountKey?: { toBase58?: () => string } | string;
					writableIndexes?: number[];
					readonlyIndexes?: number[];
				};
				return {
					accountKey:
						typeof (a.accountKey as { toBase58?: unknown })?.toBase58 ===
						"function"
							? (a.accountKey as { toBase58: () => string }).toBase58()
							: String(a.accountKey),
					writableIndexes: Array.from(a.writableIndexes || []),
					readonlyIndexes: Array.from(a.readonlyIndexes || []),
				};
			});
			const header = msg.header || {
				numRequiredSignatures: tx.signatures.length,
				numReadonlySignedAccounts: 0,
				numReadonlyUnsignedAccounts: 0,
			};
			const recentBlockhash = msg.recentBlockhash || "";

			const isV0 = typeof msg.version === "number" ? msg.version === 0 : true;
			const result = {
				slot: rec.slot,
				transaction: {
					signatures: [signature],
					message: {
						accountKeys,
						header,
						recentBlockhash,
						instructions,
						addressTableLookups,
					},
				},
				version: isV0 ? 0 : "legacy",
				meta: {
					status: rec.err ? { Err: rec.err } : { Ok: null },
					err: rec.err ?? null,
					fee: rec.fee,
					loadedAddresses: { writable: [], readonly: [] },
					preBalances: Array.isArray(rec.preBalances) ? rec.preBalances : [],
					postBalances: Array.isArray(rec.postBalances) ? rec.postBalances : [],
					innerInstructions: Array.isArray(rec.innerInstructions)
						? rec.innerInstructions
						: [],
					logMessages: rec.logs || [],
					preTokenBalances: (() => {
						const arr = (rec as unknown as { preTokenBalances?: unknown[] })
							.preTokenBalances;
						return Array.isArray(arr) ? arr : [];
					})(),
					postTokenBalances: (() => {
						const arr = (rec as unknown as { postTokenBalances?: unknown[] })
							.postTokenBalances;
						return Array.isArray(arr) ? arr : [];
					})(),
					computeUnitsConsumed:
						typeof rec.computeUnits === "number" ? rec.computeUnits : null,
					returnData: (() => {
						const rd = rec.returnData as
							| { programId: string; dataBase64: string }
							| null
							| undefined;
						if (!rd) return null;
						return { programId: rd.programId, data: [rd.dataBase64, "base64"] };
					})(),
					rewards: [],
				},
				blockTime: rec.blockTime,
			};

			if (encoding === "jsonParsed") {
				const accountKeysParsed = accountKeys.map((pk: string, i: number) => ({
					pubkey: pk,
					signer:
						typeof msg.isAccountSigner === "function"
							? !!msg.isAccountSigner(i)
							: i < (header?.numRequiredSignatures ?? 0),
					writable:
						typeof msg.isAccountWritable === "function"
							? !!msg.isAccountWritable(i)
							: i < (header?.numRequiredSignatures ?? 0),
				}));
				// Collect token balance hints: (mint, decimals) pairs to help identify mint when keys are missing
				const preTbs = ((result as unknown as { meta?: { preTokenBalances?: unknown[] } })?.meta?.preTokenBalances || []) as Array<{
					mint?: string;
					uiTokenAmount?: { decimals?: number };
				}>;
				const postTbs = ((result as unknown as { meta?: { postTokenBalances?: unknown[] } })?.meta?.postTokenBalances || []) as Array<{
					mint?: string;
					uiTokenAmount?: { decimals?: number };
				}>;
				const tokenBalanceHints: Array<{ mint: string; decimals: number }> = [];
				for (const tb of [...preTbs, ...postTbs]) {
					try {
						const mint = tb?.mint ? String(tb.mint) : "";
						const decimals = Number(tb?.uiTokenAmount?.decimals ?? 0);
						if (mint) tokenBalanceHints.push({ mint, decimals });
					} catch {}
				}
				const parsedInstructions = compiled.map((ci) => {
					const c = ci as {
						programIdIndex: number;
						accountKeyIndexes?: number[];
						accounts?: number[];
						data: Uint8Array | number[];
					};
					const dataBytes: Uint8Array =
						c.data instanceof Uint8Array ? c.data : Buffer.from(c.data);
					const accountsIdx = Array.from(
						c.accountKeyIndexes || c.accounts || [],
					);
					const programId = accountKeys[c.programIdIndex];
					return parseInstruction(
						programId,
						accountsIdx,
						context.encodeBase58(dataBytes),
						accountKeys,
						tokenBalanceHints,
					);
				});
				(result.transaction.message as { accountKeys: unknown[] }).accountKeys =
					accountKeysParsed;
				(
					result.transaction.message as { instructions: unknown[] }
				).instructions = parsedInstructions as unknown[];
				// Parse inner instructions using the same parser
				try {
					const inner = (
						result.meta as unknown as {
							innerInstructions?: unknown;
						}
					)?.innerInstructions as
						| Array<{ index: number; instructions: unknown[] }>
						| undefined;
					if (Array.isArray(inner)) {
						const parsedInner = inner.map((group) => ({
							index: group.index,
							instructions: (group.instructions || []).map((ii) => {
								const accountsIdx = Array.isArray(ii.accounts)
									? ii.accounts
									: [];
								const dataB58 =
									typeof ii.data === "string" ? ii.data : String(ii.data ?? "");
								const pid =
									accountKeys[ii.programIdIndex ?? 0] || accountKeys[0];
								return parseInstruction(
									pid,
									accountsIdx,
									dataB58,
									accountKeys,
									tokenBalanceHints,
								);
							}),
						}));
						(
							result as unknown as {
								meta: { innerInstructions?: unknown };
							}
						).meta.innerInstructions = parsedInner as unknown[];
					}
				} catch {}
			}

			return context.createSuccessResponse(id, result);
		}

		// Fallback: persistent store
		try {
			const row = await context.store?.getTransaction(signature);
			if (row) {
				try {
					if (DBG)
						console.debug(
							`[tx-capture] getTransaction hit sqlite: slot=${row.slot} logs=${JSON.parse(row.logsJson || "[]").length} inner=${JSON.parse(row.innerInstructionsJson || "[]").length}`,
						);
				} catch {}
				const errVal = row.errJson ? JSON.parse(row.errJson) : null;
				const preBalances = JSON.parse(row.preBalancesJson || "[]");
				const postBalances = JSON.parse(row.postBalancesJson || "[]");
				const logs = JSON.parse(row.logsJson || "[]");
				const inner = JSON.parse(row.innerInstructionsJson || "[]");
				const versionVal =
					row.version === "0" || row.version === 0 ? 0 : row.version;
				if (encoding === "base64") {
					return context.createSuccessResponse(id, {
						slot: Number(row.slot),
						transaction: [row.rawBase64, "base64"],
						version: versionVal,
						meta: {
							status: errVal ? { Err: errVal } : { Ok: null },
							err: errVal,
							fee: Number(row.fee),
							loadedAddresses: { writable: [], readonly: [] },
							preBalances,
							postBalances,
							innerInstructions: Array.isArray(inner) ? inner : [],
							logMessages: logs,
							preTokenBalances: JSON.parse(row.preTokenBalancesJson || "[]"),
							postTokenBalances: JSON.parse(row.postTokenBalancesJson || "[]"),
							computeUnitsConsumed:
								row.computeUnits != null ? Number(row.computeUnits) : null,
							returnData: (() => {
								if (row.returnDataProgramId && row.returnDataBase64)
									return {
										programId: row.returnDataProgramId,
										data: [row.returnDataBase64, "base64"],
									};
								return null;
							})(),
							rewards: [],
						},
						blockTime: row.blockTime ? Number(row.blockTime) : null,
					});
				} else if (encoding === "jsonParsed") {
					// Build jsonParsed similar to in-memory path
					const raw = Buffer.from(row.rawBase64, "base64");
					const tx = VersionedTransaction.deserialize(raw);
					const msg = tx.message as unknown as {
						staticAccountKeys?: unknown[];
						accountKeys?: unknown[];
						compiledInstructions?: unknown[];
						instructions?: unknown[];
						header?: unknown;
						recentBlockhash?: string;
						addressTableLookups?: unknown[];
						isAccountSigner?: (i: number) => boolean;
						isAccountWritable?: (i: number) => boolean;
					};
					const rawKeys2: unknown[] = Array.isArray(msg.staticAccountKeys)
						? msg.staticAccountKeys
						: Array.isArray(msg.accountKeys)
							? msg.accountKeys
							: [];
					const accountKeys = rawKeys2.map((k) => {
						try {
							return typeof k === "string"
								? k
								: (k as { toBase58: () => string }).toBase58();
						} catch {
							return String(k);
						}
					});
					const header = msg.header || {
						numRequiredSignatures: tx.signatures.length,
						numReadonlySignedAccounts: 0,
						numReadonlyUnsignedAccounts: 0,
					};
					const compiled: unknown[] = Array.isArray(msg.compiledInstructions)
						? msg.compiledInstructions
						: Array.isArray(msg.instructions)
							? msg.instructions
							: [];
					const parsedInstructions = compiled.map((ci) => {
						const c = ci as {
							programIdIndex: number;
							accountKeyIndexes?: number[];
							accounts?: number[];
							data: Uint8Array | number[];
						};
						const dataBytes: Uint8Array =
							c.data instanceof Uint8Array ? c.data : Buffer.from(c.data);
						const accountsIdx = Array.from(
							c.accountKeyIndexes || c.accounts || [],
						);
						const programId = accountKeys[c.programIdIndex];
						return parseInstruction(
							programId,
							accountsIdx,
							context.encodeBase58(dataBytes),
							accountKeys,
						);
					});
					const accountKeysParsed = accountKeys.map(
						(pk: string, i: number) => ({
							pubkey: pk,
							signer:
								typeof msg.isAccountSigner === "function"
									? !!msg.isAccountSigner(i)
									: i < (header?.numRequiredSignatures ?? 0),
							writable:
								typeof msg.isAccountWritable === "function"
									? !!msg.isAccountWritable(i)
									: i < (header?.numRequiredSignatures ?? 0),
						}),
					);
					const result = {
						slot: Number(row.slot),
						transaction: {
							signatures: [signature],
							message: {
								accountKeys: accountKeysParsed,
								header,
								recentBlockhash: msg.recentBlockhash || "",
								instructions: parsedInstructions,
								addressTableLookups: msg.addressTableLookups || [],
							},
						},
						version: row.version === "0" || row.version === 0 ? 0 : row.version,
						meta: {
							status: errVal ? { Err: errVal } : { Ok: null },
							err: errVal,
							fee: Number(row.fee),
							loadedAddresses: { writable: [], readonly: [] },
							preBalances,
							postBalances,
							innerInstructions: Array.isArray(inner) ? inner : [],
							logMessages: logs,
							preTokenBalances: JSON.parse(row.preTokenBalancesJson || "[]"),
							postTokenBalances: JSON.parse(row.postTokenBalancesJson || "[]"),
							computeUnitsConsumed:
								row.computeUnits != null ? Number(row.computeUnits) : null,
							returnData: (() => {
								if (row.returnDataProgramId && row.returnDataBase64)
									return {
										programId: row.returnDataProgramId,
										data: [row.returnDataBase64, "base64"],
									};
								return null;
							})(),
							rewards: [],
						},
						blockTime: row.blockTime ? Number(row.blockTime) : null,
					};
					// Also parse inner instructions from DB row
					try {
						const innerSrc = JSON.parse(row.innerInstructionsJson || "[]");
						const groups: unknown[] = Array.isArray(innerSrc) ? innerSrc : [];
						const innerParsed = groups.map((group) => {
							const g = group as Record<string, unknown>;
							const instrSrc = Array.isArray(g.instructions)
								? (g.instructions as unknown[])
								: [];
							const instructions = instrSrc.map((ii) => {
								const r = ii as Record<string, unknown>;
								const pidIdx =
									typeof r.programIdIndex === "number" ? r.programIdIndex : 0;
								const accountsIdx = Array.isArray(r.accounts)
									? (r.accounts as unknown[]).filter(
											(v): v is number => typeof v === "number",
										)
									: [];
								const dataB58 =
									typeof r.data === "string" ? r.data : String(r.data ?? "");
								return parseInstruction(
									accountKeys[pidIdx] || accountKeys[0],
									accountsIdx,
									dataB58,
									accountKeys,
								);
							});
							return {
								index: Number(g.index || 0),
								instructions,
							};
						});
						(
							result as unknown as { meta: { innerInstructions?: unknown } }
						).meta.innerInstructions = innerParsed as unknown[];
					} catch {}

					return context.createSuccessResponse(id, result);
				} else {
					const raw = Buffer.from(row.rawBase64, "base64");
					const tx = VersionedTransaction.deserialize(raw);
					const msg = tx.message as unknown as {
						staticAccountKeys?: unknown[];
						accountKeys?: unknown[];
						compiledInstructions?: unknown[];
						instructions?: unknown[];
						header?: unknown;
						recentBlockhash?: string;
						addressTableLookups?: unknown[];
					};
					const rawKeys3: unknown[] = Array.isArray(msg.staticAccountKeys)
						? msg.staticAccountKeys
						: Array.isArray(msg.accountKeys)
							? msg.accountKeys
							: [];
					const accountKeys = rawKeys3.map((k) => {
						try {
							return typeof k === "string"
								? k
								: (k as { toBase58: () => string }).toBase58();
						} catch {
							return String(k);
						}
					});
					const header = msg.header || {
						numRequiredSignatures: tx.signatures.length,
						numReadonlySignedAccounts: 0,
						numReadonlyUnsignedAccounts: 0,
					};
					const compiled: unknown[] = Array.isArray(msg.compiledInstructions)
						? msg.compiledInstructions
						: Array.isArray(msg.instructions)
							? msg.instructions
							: [];
					const instructions = compiled.map((ci) => {
						const c = ci as {
							programIdIndex: number;
							accountKeyIndexes?: number[];
							accounts?: number[];
							data: Uint8Array | number[];
						};
						return {
							programIdIndex: c.programIdIndex,
							accounts: Array.from(c.accountKeyIndexes || c.accounts || []),
							data: context.encodeBase58(
								c.data instanceof Uint8Array ? c.data : Buffer.from(c.data),
							),
						};
					});
					const result = {
						slot: Number(row.slot),
						transaction: {
							signatures: [signature],
							message: {
								accountKeys,
								header,
								recentBlockhash: msg.recentBlockhash || "",
								instructions,
								addressTableLookups: msg.addressTableLookups || [],
							},
						},
						version: versionVal,
						meta: {
							status: errVal ? { Err: errVal } : { Ok: null },
							err: errVal,
							fee: Number(row.fee),
							loadedAddresses: { writable: [], readonly: [] },
							preBalances,
							postBalances,
							innerInstructions: Array.isArray(inner) ? inner : [],
							logMessages: logs,
							preTokenBalances: JSON.parse(row.preTokenBalancesJson || "[]"),
							postTokenBalances: JSON.parse(row.postTokenBalancesJson || "[]"),
							computeUnitsConsumed:
								row.computeUnits != null ? Number(row.computeUnits) : null,
							returnData: (() => {
								if (row.returnDataProgramId && row.returnDataBase64)
									return {
										programId: row.returnDataProgramId,
										data: [row.returnDataBase64, "base64"],
									};
								return null;
							})(),
							rewards: [],
						},
						blockTime: row.blockTime ? Number(row.blockTime) : null,
					};
					return context.createSuccessResponse(id, result);
				}
			}
		} catch {}

		// Fallback to LiteSVM history when no local record exists
		const sigBytes = context.decodeBase58(signature);
		const getTx = (
			context.svm as unknown as {
				getTransaction?: (
					sig: Uint8Array,
				) =>
					| { logs: () => string[]; err: () => unknown }
					| { meta: () => { logs: () => string[] }; err: () => unknown };
			}
		).getTransaction;
		const txh = typeof getTx === "function" ? getTx(sigBytes) : undefined;
		if (!txh) return context.createSuccessResponse(id, null);

		const isError = "err" in txh;
		const logs = isError ? txh.meta().logs() : txh.logs();
		const errVal = isError ? txh.err() : null;
		const status = isError ? { Err: errVal } : { Ok: null };
		const isV0 = true;
		return context.createSuccessResponse(id, {
			slot: Number(context.slot),
			transaction: {
				signatures: [signature],
			},
			version: isV0 ? 0 : "legacy",
			meta: {
				status,
				err: errVal,
				fee: 5000,
				loadedAddresses: { writable: [], readonly: [] },
				preBalances: [],
				postBalances: [],
				innerInstructions: [],
				logMessages: logs,
				preTokenBalances: [],
				postTokenBalances: [],
				rewards: [],
			},
			blockTime: Math.floor(Date.now() / 1000),
		});
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		return context.createErrorResponse(id, -32602, "Invalid params", message);
	}
};
