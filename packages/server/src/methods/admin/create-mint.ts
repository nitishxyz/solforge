import { MINT_SIZE, MintLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import type { RpcMethodHandler } from "../../types";

// Create a new SPL Mint locally with given decimals and mint authority
export const solforgeCreateMint: RpcMethodHandler = async (
	id,
	params,
	context,
) => {
	try {
		const [mintStr, decimals, authorityStr] = params as [
			string | null | undefined,
			number,
			string | null | undefined,
		];
		if (typeof decimals !== "number" || decimals < 0 || decimals > 18)
			return context.createErrorResponse(
				id,
				-32602,
				"Invalid params: decimals required (0-18)",
			);
		const authority = authorityStr
			? new PublicKey(authorityStr)
			: context.getFaucet().publicKey;
		const mintPk = mintStr ? new PublicKey(mintStr) : PublicKey.unique();

		const buf = Buffer.alloc(MINT_SIZE);
		type MintStruct = Parameters<typeof MintLayout.encode>[0];
		const initialMint = {
			mintAuthorityOption: 1,
			mintAuthority: authority,
			supply: 0n,
			decimals,
			isInitialized: true,
			freezeAuthorityOption: 0,
			freezeAuthority: PublicKey.default,
		} satisfies Partial<MintStruct> as MintStruct;
		MintLayout.encode(initialMint, buf);

		const rentLamports = Number(
			context.svm.minimumBalanceForRentExemption(BigInt(MINT_SIZE)),
		);
		context.svm.setAccount(mintPk, {
			lamports: rentLamports,
			data: new Uint8Array(buf),
			owner: TOKEN_PROGRAM_ID,
			executable: false,
			rentEpoch: 0,
		});
		try {
			context.registerMint?.(mintPk);
		} catch {}
		try {
			await context.store?.upsertAccounts([
				{
					address: mintPk.toBase58(),
					lamports: rentLamports,
					ownerProgram: TOKEN_PROGRAM_ID.toBase58(),
					executable: false,
					rentEpoch: 0,
					dataLen: MINT_SIZE,
					dataBase64: undefined,
					lastSlot: Number(context.slot),
				},
			]);
		} catch {}
		// Synthetic transaction for explorers
		try {
			const sig = `admin:create-mint:${mintPk.toBase58()}:${Date.now()}`;
			await context.store?.insertTransactionBundle({
				signature: sig,
				slot: Number(context.slot),
				blockTime: Math.floor(Date.now() / 1000),
				version: "legacy",
				fee: 0,
				err: null,
				rawBase64: "",
				preBalances: [],
				postBalances: [],
				logs: ["admin create mint"],
				accounts: [
					{
						address: mintPk.toBase58(),
						index: 0,
						signer: false,
						writable: true,
					},
					{
						address: authority.toBase58(),
						index: 1,
						signer: false,
						writable: false,
					},
				],
			});
		} catch {}
		return context.createSuccessResponse(id, {
			ok: true,
			mint: mintPk.toBase58(),
			decimals,
			authority: authority.toBase58(),
		});
	} catch (e) {
		return context.createErrorResponse(
			id,
			-32603,
			"Create mint failed",
			(e as Error)?.message || String(e),
		);
	}
};

export type { RpcMethodHandler } from "../../types";
