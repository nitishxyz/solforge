import {
	ACCOUNT_SIZE,
	AccountLayout,
	getAssociatedTokenAddressSync,
	TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import type { RpcMethodHandler } from "../../types";

// Create or overwrite a token account (ATA) with a specified amount
export const solforgeCreateTokenAccount: RpcMethodHandler = async (
	id,
	params,
	context,
) => {
	try {
		const [mintStr, ownerStr, rawAmount, decimals] = params as [
			string,
			string | null | undefined,
			number | string | bigint,
			number?,
		];
		if (!mintStr || rawAmount == null)
			return context.createErrorResponse(
				id,
				-32602,
				"Invalid params: mint and amount required",
			);
		const mint = new PublicKey(mintStr);
		const owner = ownerStr
			? new PublicKey(ownerStr)
			: context.getFaucet().publicKey;
		// Amount is in base units (not UI). The layout stores a u64 bigint
		const amount =
			typeof rawAmount === "bigint" ? rawAmount : BigInt(rawAmount);

		const buf = Buffer.alloc(ACCOUNT_SIZE);
		type TokenAccountStruct = Parameters<typeof AccountLayout.encode>[0];
		const tokenAccount = {
			mint,
			owner,
			amount,
			delegateOption: 0,
			delegate: PublicKey.default,
			delegatedAmount: 0n,
			state: 1,
			isNativeOption: 0,
			isNative: 0n,
			closeAuthorityOption: 0,
			closeAuthority: PublicKey.default,
		} satisfies Partial<TokenAccountStruct> as TokenAccountStruct;
		AccountLayout.encode(tokenAccount, buf);

		const rentLamports = Number(
			context.svm.minimumBalanceForRentExemption(BigInt(ACCOUNT_SIZE)),
		);

		// Compute the canonical associated token account address for mint+owner
		const address = getAssociatedTokenAddressSync(mint, owner, true);

		context.svm.setAccount(address, {
			lamports: rentLamports,
			data: new Uint8Array(buf),
			owner: TOKEN_PROGRAM_ID,
			executable: false,
			rentEpoch: 0,
		});
		try {
			await context.store?.upsertAccounts([
				{
					address: address.toBase58(),
					lamports: rentLamports,
					ownerProgram: TOKEN_PROGRAM_ID.toBase58(),
					executable: false,
					rentEpoch: 0,
					dataLen: ACCOUNT_SIZE,
					dataBase64: undefined,
					lastSlot: Number(context.slot),
				},
			]);
		} catch {}
		// Record a synthetic transaction so explorers can show activity
		try {
			const sig = `admin:mint:${address.toBase58()}:${Date.now()}`;
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
				logs: ["admin mint"],
				accounts: [
					{
						address: address.toBase58(),
						index: 0,
						signer: false,
						writable: true,
					},
					{
						address: mint.toBase58(),
						index: 1,
						signer: false,
						writable: false,
					},
					{
						address: owner.toBase58(),
						index: 2,
						signer: false,
						writable: false,
					},
				],
			});
		} catch {}

		return context.createSuccessResponse(id, {
			ok: true,
			address: address.toBase58(),
			mint: mintStr,
			owner: owner.toBase58(),
			amount: amount.toString(),
			decimals: decimals ?? null,
		});
	} catch (e) {
		return context.createErrorResponse(
			id,
			-32603,
			"Create token account failed",
			(e as Error)?.message || String(e),
		);
	}
};

export type { RpcMethodHandler } from "../../types";
