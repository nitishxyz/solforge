import {
	ACCOUNT_SIZE,
	getAssociatedTokenAddressSync,
	TOKEN_2022_PROGRAM_ID,
	TOKEN_PROGRAM_ID,
	unpackAccount,
	unpackMint,
} from "@solana/spl-token";
import { type AccountInfo, PublicKey } from "@solana/web3.js";
import type { RpcMethodHandler } from "../../types";

export const getTokenAccountsByOwner: RpcMethodHandler = async (
	id,
	params,
	context,
) => {
	try {
		const [ownerStr, filter, config] = params || [];
		if (!ownerStr) throw new Error("owner public key required");
		const owner = new PublicKey(ownerStr);
		const wantMint: string | null = filter?.mint ? String(filter.mint) : null;
		const requestedProgramId: string | null = filter?.programId
			? String(filter.programId)
			: null;
		const encoding: string = config?.encoding || "jsonParsed";
		const classicId = TOKEN_PROGRAM_ID.toBase58();
		const token2022Id = TOKEN_2022_PROGRAM_ID.toBase58();
		const programIds = requestedProgramId
			? [requestedProgramId]
			: [classicId, token2022Id];

		// Query DB for accounts owned by both SPL Token programs (classic + 2022)
		const rows: Array<{ address: string; lastSlot: number } & any> = [];
		for (const programId of programIds) {
			try {
				const found =
					(await context.store?.getAccountsByOwner(programId, 50_000)) || [];
				rows.push(...found);
			} catch (dbErr) {
				try {
					console.warn("[rpc] getTokenAccountsByOwner: db read failed", dbErr);
				} catch {}
			}
		}

		const out: any[] = [];
		const seen = new Set<string>();
		for (const r of rows) {
			if (seen.has(r.address)) continue;
			try {
				const pk = new PublicKey(r.address);
				const acc = context.svm.getAccount(pk);
				if (!acc) continue;
				if ((acc.data?.length ?? 0) < 165) continue;
				let ownerPk: PublicKey;
				try {
					// acc.owner may already be a PublicKey in LiteSVM
					const anyOwner: any = (acc as any).owner;
					ownerPk =
						typeof anyOwner?.toBase58 === "function"
							? (anyOwner as PublicKey)
							: new PublicKey(anyOwner);
				} catch {
					ownerPk = TOKEN_PROGRAM_ID; // fallback avoids throw; unpackAccount will fail if wrong and be skipped
				}
				const programPk = ownerPk.equals(TOKEN_2022_PROGRAM_ID)
					? TOKEN_2022_PROGRAM_ID
					: TOKEN_PROGRAM_ID;
				const dec = unpackAccount(
					pk,
					{ data: Buffer.from(acc.data), owner: ownerPk },
					programPk,
				);
				const decMint = dec.mint.toBase58();
				const decOwner = dec.owner.toBase58();
				if (decOwner !== owner.toBase58()) continue;
				if (wantMint && decMint !== wantMint) continue;
				if (encoding === "jsonParsed") {
					let decimals = 0;
					try {
						const mintAcc = context.svm.getAccount(dec.mint);
						const mintOwnerPk = mintAcc
							? typeof (mintAcc as any).owner?.toBase58 === "function"
								? (mintAcc as any).owner
								: new PublicKey(mintAcc.owner)
							: programPk;
						const info = mintAcc
							? unpackMint(
									dec.mint,
									{
										data: Buffer.from(mintAcc.data),
										owner: mintOwnerPk,
									} as AccountInfo<Buffer>,
									mintOwnerPk,
								)
							: null;
						decimals = info?.decimals ?? 0;
					} catch {}
					const amount = BigInt(dec.amount?.toString?.() ?? dec.amount ?? 0);
					const ui = decimals >= 0 ? Number(amount) / 10 ** decimals : null;
					const state = dec.isFrozen
						? "frozen"
						: dec.isInitialized
							? "initialized"
							: "uninitialized";
					const amountUi = {
						amount: amount.toString(),
						decimals,
						uiAmount: ui,
						uiAmountString: (ui ?? 0).toString(),
					};
					// delegatedAmount as UiTokenAmount per RPC schema
					const delegated = BigInt(
						dec.delegatedAmount?.toString?.() ?? dec.delegatedAmount ?? 0n,
					);
					const delegatedUiAmount =
						decimals >= 0 ? Number(delegated) / 10 ** decimals : null;
					const delegatedAmount = {
						amount: delegated.toString(),
						decimals,
						uiAmount: delegatedUiAmount,
						uiAmountString: (delegatedUiAmount ?? 0).toString(),
					};
					// rentExemptReserve only for native (wrapped SOL) accounts; value in lamports (9 decimals)
					let rentExemptReserve = null as any;
					if (dec.isNative) {
						const lamports = BigInt(
							dec.rentExemptReserve?.toString?.() ??
								dec.rentExemptReserve ??
								0n,
						);
						const lamportsUi = Number(lamports) / 1_000_000_000;
						rentExemptReserve = {
							amount: lamports.toString(),
							decimals: 9,
							uiAmount: lamportsUi,
							uiAmountString: lamportsUi.toString(),
						};
					}
					const programLabel = programPk.equals(TOKEN_2022_PROGRAM_ID)
						? "spl-token-2022"
						: "spl-token";
					out.push({
						pubkey: r.address,
						account: {
							lamports: Number(acc.lamports || 0n),
							owner: ownerPk.toBase58(),
							executable: !!acc.executable,
							rentEpoch: Number(acc.rentEpoch || 0),
							data: {
								program: programLabel,
								parsed: {
									type: "account",
									info: {
										mint: decMint,
										owner: decOwner,
										tokenAmount: amountUi,
										state,
										isNative: !!dec.isNative,
										delegatedAmount: delegatedAmount,
										delegate: dec.delegate ? dec.delegate.toBase58() : null,
										rentExemptReserve,
										closeAuthority: dec.closeAuthority
											? dec.closeAuthority.toBase58()
											: null,
									},
								},
								space: acc.data?.length ?? 0,
							},
						},
					});
					seen.add(r.address);
				} else {
					out.push({
						pubkey: r.address,
						account: {
							lamports: Number(acc.lamports || 0n),
							owner: ownerPk.toBase58(),
							executable: !!acc.executable,
							rentEpoch: Number(acc.rentEpoch || 0),
							data: [
								Buffer.from(acc.data).toString("base64"),
								"base64",
							] as const,
						},
					});
					seen.add(r.address);
				}
			} catch {}
		}
		// Fallback: probe known mints' ATAs for this owner
		try {
			const mints = context.listMints ? context.listMints() : [];
			for (const m of mints) {
				try {
					const ata = getAssociatedTokenAddressSync(
						new PublicKey(m),
						owner,
						true,
					);
					const acc = context.svm.getAccount(ata);
					if (!acc || (acc.data?.length ?? 0) < ACCOUNT_SIZE) continue;
					if (seen.has(ata.toBase58())) continue;
					let ownerPk: PublicKey;
					const anyOwner: any = (acc as any).owner;
					ownerPk =
						typeof anyOwner?.toBase58 === "function"
							? (anyOwner as PublicKey)
							: new PublicKey(anyOwner);
					const programPk = ownerPk.equals(TOKEN_2022_PROGRAM_ID)
						? TOKEN_2022_PROGRAM_ID
						: TOKEN_PROGRAM_ID;
					const dec = unpackAccount(
						ata,
						{ data: Buffer.from(acc.data), owner: ownerPk },
						programPk,
					);
					const decMint = dec.mint.toBase58();
					const decOwner = dec.owner.toBase58();
					if (decOwner !== owner.toBase58()) continue;
					let decimals = 0;
					try {
						const mintAcc = context.svm.getAccount(dec.mint);
						const mintOwnerPk = mintAcc
							? typeof (mintAcc as any).owner?.toBase58 === "function"
								? (mintAcc as any).owner
								: new PublicKey(mintAcc.owner)
							: programPk;
						const info = mintAcc
							? unpackMint(
									dec.mint,
									{
										data: Buffer.from(mintAcc.data),
										owner: mintOwnerPk,
									} as AccountInfo<Buffer>,
									mintOwnerPk,
								)
							: null;
						decimals = info?.decimals ?? 0;
					} catch {}
					const amount = BigInt(dec.amount?.toString?.() ?? dec.amount ?? 0);
					const ui = decimals >= 0 ? Number(amount) / 10 ** decimals : null;
					const state = dec.isFrozen
						? "frozen"
						: dec.isInitialized
							? "initialized"
							: "uninitialized";
					const amountUi = {
						amount: amount.toString(),
						decimals,
						uiAmount: ui,
						uiAmountString: (ui ?? 0).toString(),
					};
					const programLabel = programPk.equals(TOKEN_2022_PROGRAM_ID)
						? "spl-token-2022"
						: "spl-token";
					out.push({
						pubkey: ata.toBase58(),
						account: {
							lamports: Number(acc.lamports || 0n),
							owner: ownerPk.toBase58(),
							executable: !!acc.executable,
							rentEpoch: Number(acc.rentEpoch || 0),
							data: {
								program: programLabel,
								parsed: {
									type: "account",
									info: {
										mint: decMint,
										owner: decOwner,
										tokenAmount: amountUi,
										state,
										isNative: !!dec.isNative,
									},
								},
								space: acc.data?.length ?? 0,
							},
						},
					});
					seen.add(ata.toBase58());
				} catch {}
			}
		} catch {}
		return context.createSuccessResponse(id, {
			context: { slot: Number(context.slot) },
			value: out,
		});
	} catch (e: any) {
		try {
			console.error("[rpc] getTokenAccountsByOwner error", e);
		} catch {}
		return context.createErrorResponse(
			id,
			-32603,
			"Internal error",
			e?.message || String(e),
		);
	}
};
