import {
	TOKEN_2022_PROGRAM_ID,
	TOKEN_PROGRAM_ID,
	unpackAccount,
	unpackMint,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import type { RpcMethodHandler } from "../../types";
import { parseUpgradeableLoader } from "../account/parsers/loader-upgradeable";

export const getProgramAccounts: RpcMethodHandler = async (
	id,
	params,
	context,
) => {
	const [programId, cfg] = params || [];
	try {
		const programPk = new PublicKey(programId);
		const programStr = programPk.toBase58();
		const encoding: string = cfg?.encoding || "base64";
		const dataSlice = cfg?.dataSlice as
			| { offset: number; length: number }
			| undefined;
		const filters = (cfg?.filters || []) as Array<any>;
		const limit = Math.max(1, Math.min(Number(cfg?.limit ?? 10000), 50000));

		let rows: Array<{ address: string }> = [];
		try {
			rows = (await context.store?.getAccountsByOwner(programStr, limit)) || [];
		} catch {}

		const out: any[] = [];
		for (const r of rows) {
			try {
				const pk = new PublicKey(r.address);
				const acc = context.svm.getAccount(pk);
				if (!acc) continue;

				// dataSize filter
				if (
					filters.some((f) => typeof f?.dataSize === "number") &&
					!filters.every(
						(f) => f.dataSize == null || (acc.data?.length ?? 0) === f.dataSize,
					)
				)
					continue;
				// memcmp filters
				const raw = new Uint8Array(acc.data || []);
				let memcmpOk = true;
				for (const f of filters) {
					if (!f?.memcmp) continue;
					const off = Number(f.memcmp.offset || 0);
					const bytesStr: string = String(f.memcmp.bytes || "");
					let needle: Uint8Array;
					try {
						needle = context.decodeBase58(bytesStr);
					} catch {
						try {
							needle = Buffer.from(bytesStr, "base64");
						} catch {
							needle = new Uint8Array();
						}
					}
					for (let i = 0; i < needle.length; i++) {
						if (raw[off + i] !== needle[i]) {
							memcmpOk = false;
							break;
						}
					}
					if (!memcmpOk) break;
				}
				if (!memcmpOk) continue;

				if (
					encoding === "jsonParsed" &&
					(programPk.equals(TOKEN_PROGRAM_ID) ||
						programPk.equals(TOKEN_2022_PROGRAM_ID))
				) {
					if ((acc.data?.length ?? 0) < 165) continue;
					const ownerPk = new PublicKey(acc.owner);
					const dec = unpackAccount(
						pk,
						{ data: Buffer.from(acc.data), owner: ownerPk },
						programPk,
					);
					// mint decimals
					let decimals = 0;
					try {
						const mintAcc = context.svm.getAccount(dec.mint);
						if (mintAcc) {
							const mintProg = new PublicKey(mintAcc.owner).equals(
								TOKEN_2022_PROGRAM_ID,
							)
								? TOKEN_2022_PROGRAM_ID
								: TOKEN_PROGRAM_ID;
							const mi = unpackMint(
								dec.mint,
								{
									data: Buffer.from(mintAcc.data),
									owner: new PublicKey(mintAcc.owner),
								},
								mintProg,
							);
							decimals = mi?.decimals ?? 0;
						}
					} catch {}
					const amount = BigInt(dec.amount?.toString?.() ?? dec.amount ?? 0);
					const ui = decimals >= 0 ? Number(amount) / 10 ** decimals : null;
					const state = dec.isFrozen
						? "frozen"
						: dec.isInitialized
							? "initialized"
							: "uninitialized";
					const programLabel = programPk.equals(TOKEN_2022_PROGRAM_ID)
						? "spl-token-2022"
						: "spl-token";
					out.push({
						pubkey: r.address,
						account: {
							lamports: Number(acc.lamports || 0n),
							owner: programStr,
							executable: !!acc.executable,
							rentEpoch: Number(acc.rentEpoch || 0),
							data: {
								program: programLabel,
								parsed: {
									type: "account",
									info: {
										mint: dec.mint.toBase58(),
										owner: dec.owner.toBase58(),
										tokenAmount: {
											amount: amount.toString(),
											decimals,
											uiAmount: ui,
											uiAmountString: (ui ?? 0).toString(),
										},
										state,
										isNative: !!dec.isNative,
										delegatedAmount: {
											amount: BigInt(
												dec.delegatedAmount?.toString?.() ??
													dec.delegatedAmount ??
													0,
											).toString(),
											decimals,
											uiAmount: null,
											uiAmountString: "0",
										},
										delegate: dec.delegate ? dec.delegate.toBase58() : null,
										rentExemptReserve: dec.isNative
											? {
													amount: BigInt(
														dec.rentExemptReserve?.toString?.() ??
															dec.rentExemptReserve ??
															0,
													).toString(),
													decimals: 9,
													uiAmount: null,
													uiAmountString: "0",
												}
											: null,
										closeAuthority: dec.closeAuthority
											? dec.closeAuthority.toBase58()
											: null,
									},
								},
								space: acc.data?.length ?? 0,
							},
						},
					});
				} else if (
					encoding === "jsonParsed" &&
					programStr === "BPFLoaderUpgradeab1e11111111111111111111111"
				) {
					const parsed = parseUpgradeableLoader(programStr, raw, context);
					out.push({
						pubkey: r.address,
						account: {
							lamports: Number(acc.lamports || 0n),
							owner: programStr,
							executable: !!acc.executable,
							rentEpoch: Number(acc.rentEpoch || 0),
							data: parsed,
						},
					});
				} else {
					let bytes = Buffer.from(acc.data);
					if (
						dataSlice &&
						Number.isFinite(dataSlice.offset) &&
						Number.isFinite(dataSlice.length)
					) {
						bytes = bytes.subarray(
							dataSlice.offset,
							dataSlice.offset + dataSlice.length,
						);
					}
					out.push({
						pubkey: r.address,
						account: {
							lamports: Number(acc.lamports || 0n),
							owner: new PublicKey(acc.owner).toBase58(),
							data: [bytes.toString("base64"), "base64"] as const,
							executable: !!acc.executable,
							rentEpoch: Number(acc.rentEpoch || 0),
						},
					});
				}
			} catch {}
		}

		return context.createSuccessResponse(id, out);
	} catch (error: any) {
		return context.createErrorResponse(
			id,
			-32602,
			"Invalid params",
			error.message,
		);
	}
};
