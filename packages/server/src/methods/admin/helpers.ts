import {
	getMetadataPointerState,
	MINT_SIZE,
	TOKEN_2022_PROGRAM_ID,
	TOKEN_PROGRAM_ID,
	unpackMint,
} from "@solana/spl-token";
import type { AccountInfo, Connection, PublicKey } from "@solana/web3.js";

import type { RpcMethodContext } from "../../types";

export async function cloneMintExtensionAccounts(
	conn: Connection,
	context: RpcMethodContext,
	mint: PublicKey,
	info: AccountInfo<Buffer>,
): Promise<void> {
	if (!info.data || info.data.length <= MINT_SIZE) return;
	try {
		const programId = info.owner.equals(TOKEN_2022_PROGRAM_ID)
			? TOKEN_2022_PROGRAM_ID
			: TOKEN_PROGRAM_ID;
		const mintState = unpackMint(mint, info, programId);
		if (!mintState.tlvData || mintState.tlvData.length === 0) return;

		const metadataPtr = getMetadataPointerState(mintState);
		if (metadataPtr?.metadataAddress) {
			await cloneSingleAccount(
				conn,
				context,
				metadataPtr.metadataAddress,
				"metadata",
			);
		}
	} catch (error) {
		console.warn("[admin] mint extension clone skipped", {
			mint: mint.toBase58(),
			error: String(error),
		});
	}
}

export async function cloneSingleAccount(
	conn: Connection,
	context: RpcMethodContext,
	address: PublicKey,
	label: string,
): Promise<void> {
	try {
		const info = await conn.getAccountInfo(address, "confirmed");
		if (!info) {
			console.warn(`[admin] ${label} account not found on endpoint`, {
				address: address.toBase58(),
			});
			return;
		}
		context.svm.setAccount(address, {
			data: new Uint8Array(info.data as Buffer),
			executable: info.executable,
			lamports: Number(info.lamports),
			owner: info.owner,
			rentEpoch: 0,
		});
	} catch (error) {
		console.warn(`[admin] clone ${label} account failed`, {
			address: address.toBase58(),
			error: String(error),
		});
	}
}
