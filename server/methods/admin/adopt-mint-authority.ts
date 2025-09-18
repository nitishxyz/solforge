import { MINT_SIZE, MintLayout } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import type { RpcMethodHandler } from "../../types";

// Adopt faucet as mint authority for a given mint (LiteSVM-only, overwrites account data)
export const solforgeAdoptMintAuthority: RpcMethodHandler = async (
	id,
	params,
	context,
) => {
	try {
		const [mintStr] = params as [string];
		if (!mintStr)
			return context.createErrorResponse(
				id,
				-32602,
				"Invalid params: mint required",
			);
		const mint = new PublicKey(mintStr);
		const acct = context.svm.getAccount(mint);
		if (!acct)
			return context.createErrorResponse(
				id,
				-32004,
				"Mint not found in LiteSVM",
			);
		if (!acct.data || acct.data.length < MINT_SIZE)
			return context.createErrorResponse(
				id,
				-32000,
				"Account not a valid mint",
			);

		const faucet = context.getFaucet();
		const buf = Buffer.from(acct.data);
		type MintStruct = Parameters<typeof MintLayout.encode>[0];
		const mintDecoded = MintLayout.decode(
			buf.slice(0, MINT_SIZE),
		) as unknown as MintStruct;
		// Update authority fields
		(
			mintDecoded as unknown as { mintAuthorityOption: number }
		).mintAuthorityOption = 1;
		(mintDecoded as unknown as { mintAuthority: PublicKey }).mintAuthority =
			faucet.publicKey;
		const out = Buffer.from(buf); // preserve any extensions beyond MintLayout
		MintLayout.encode(mintDecoded as MintStruct, out);

		const ownerBase58 =
			typeof acct.owner === "string"
				? new PublicKey(acct.owner).toBase58()
				: (acct.owner as PublicKey).toBase58();
		const ownerPk = new PublicKey(ownerBase58);

		context.svm.setAccount(mint, {
			lamports: Number(acct.lamports || 0n),
			data: new Uint8Array(out),
			owner: ownerPk,
			executable: false,
			rentEpoch: 0,
		});
		try {
			context.registerMint?.(mint);
		} catch {}
		try {
			await context.store?.upsertAccounts([
				{
					address: mint.toBase58(),
					lamports: Number(acct.lamports || 0n),
					ownerProgram: ownerBase58,
					executable: false,
					rentEpoch: 0,
					dataLen: out.length,
					dataBase64: undefined,
					lastSlot: Number(context.slot),
				},
			]);
		} catch {}
		return context.createSuccessResponse(id, {
			ok: true,
			mint: mintStr,
			authority: faucet.publicKey.toBase58(),
		});
	} catch (e) {
		return context.createErrorResponse(
			id,
			-32603,
			"Adopt mint authority failed",
			(e as Error)?.message || String(e),
		);
	}
};

export type { RpcMethodHandler } from "../../types";
