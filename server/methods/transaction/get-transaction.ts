import { VersionedTransaction } from "@solana/web3.js";
import type { RpcMethodHandler } from "../../types";

export const getTransaction: RpcMethodHandler = async (id, params, context) => {
	const [signature, config] = params || [];
	const encoding = config?.encoding ?? "json";

	try {
		const rec = context.getRecordedTransaction(signature);
		if (rec) {
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
						innerInstructions: [],
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
					innerInstructions: [],
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
					rewards: [],
				},
				blockTime: rec.blockTime,
			};

			if (encoding === "jsonParsed") {
				const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111";
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
				const parsedInstructions = compiled.map((ci) => {
					const c = ci as {
						programIdIndex: number;
						accountKeyIndexes?: number[];
						accounts?: number[];
						data: Uint8Array | number[];
					};
					const programId = accountKeys[c.programIdIndex];
					let parsed: unknown;
					try {
						const data: Uint8Array =
							c.data instanceof Uint8Array ? c.data : Buffer.from(c.data);
						if (programId === SYSTEM_PROGRAM_ID && data.length >= 12) {
							const dv = new DataView(
								data.buffer,
								data.byteOffset,
								data.byteLength,
							);
							const discriminator = dv.getUint32(0, true);
							if (
								discriminator === 2 &&
								(ci.accountKeyIndexes?.length ?? 0) >= 2
							) {
								const lamports = Number(dv.getBigUint64(4, true));
								const source = accountKeys[c.accountKeyIndexes?.[0] as number];
								const destination =
									accountKeys[c.accountKeyIndexes?.[1] as number];
								parsed = {
									type: "transfer",
									info: { source, destination, lamports },
								};
							}
						}
					} catch {}
					if (parsed) return { program: "system", programId, parsed };
					return {
						programId,
						accounts: (c.accountKeyIndexes || []).map(
							(ix: number) => accountKeys[ix],
						),
						data: context.encodeBase58(
							c.data instanceof Uint8Array ? c.data : Buffer.from(c.data),
						),
					};
				});
				(result.transaction.message as { accountKeys: unknown[] }).accountKeys =
					accountKeysParsed;
				(
					result.transaction.message as { instructions: unknown[] }
				).instructions = parsedInstructions as unknown[];
			}

			return context.createSuccessResponse(id, result);
		}

		// Fallback: persistent store
		try {
			const row = await context.store?.getTransaction(signature);
			if (row) {
				const errVal = row.errJson ? JSON.parse(row.errJson) : null;
				const preBalances = JSON.parse(row.preBalancesJson || "[]");
				const postBalances = JSON.parse(row.postBalancesJson || "[]");
				const logs = JSON.parse(row.logsJson || "[]");
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
							innerInstructions: [],
							logMessages: logs,
							preTokenBalances: JSON.parse(row.preTokenBalancesJson || "[]"),
							postTokenBalances: JSON.parse(row.postTokenBalancesJson || "[]"),
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
						const programId = accountKeys[c.programIdIndex];
						let parsed: unknown;
						try {
							const data: Uint8Array =
								c.data instanceof Uint8Array ? c.data : Buffer.from(c.data);
							// Minimal system transfer parser
							if (
								programId === "11111111111111111111111111111111" &&
								data.length >= 12
							) {
								const dv = new DataView(
									data.buffer,
									data.byteOffset,
									data.byteLength,
								);
								const discriminator = dv.getUint32(0, true);
								if (
									discriminator === 2 &&
									(ci.accountKeyIndexes?.length ?? 0) >= 2
								) {
									const lamports = Number(dv.getBigUint64(4, true));
									const source = accountKeys[c.accountKeyIndexes?.[0]];
									const destination = accountKeys[c.accountKeyIndexes?.[1]];
									parsed = {
										type: "transfer",
										info: { source, destination, lamports },
									};
								}
							}
						} catch {}
						if (parsed) return { program: "system", programId, parsed };
						return {
							programId,
							accounts: (c.accountKeyIndexes || []).map(
								(ix: number) => accountKeys[ix],
							),
							data: context.encodeBase58(
								c.data instanceof Uint8Array ? c.data : Buffer.from(c.data),
							),
						};
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
							innerInstructions: [],
							logMessages: logs,
							preTokenBalances: JSON.parse(row.preTokenBalancesJson || "[]"),
							postTokenBalances: JSON.parse(row.postTokenBalancesJson || "[]"),
							rewards: [],
						},
						blockTime: row.blockTime ? Number(row.blockTime) : null,
					};
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
							innerInstructions: [],
							logMessages: logs,
							preTokenBalances: JSON.parse(row.preTokenBalancesJson || "[]"),
							postTokenBalances: JSON.parse(row.postTokenBalancesJson || "[]"),
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
