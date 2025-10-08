import { PublicKey } from "@solana/web3.js";
import type { RpcMethodHandler } from "../../types";
import type { AccountSnapshot } from "../../db/tx-store";

/**
 * Implements the getMultipleAccounts RPC method
 * @see https://docs.solana.com/api/http#getmultipleaccounts
 */
export const getMultipleAccounts: RpcMethodHandler = async (
	id,
	params,
	context,
) => {
	const [pubkeys, config] = params;
	const encoding = config?.encoding || "base64";

	const accounts = pubkeys.map((pubkeyStr: string) => {
		try {
			const pubkey = new PublicKey(pubkeyStr);
			const account = context.svm.getAccount(pubkey);

			if (!account) {
				return null;
			}

			const owner = new PublicKey(account.owner).toBase58();
			if (encoding === "jsonParsed") {
				const program =
					owner === "11111111111111111111111111111111" ? "system" : "unknown";
				const space = account.data?.length ?? 0;
				return {
					lamports: Number(account.lamports),
					owner,
					executable: account.executable,
					rentEpoch: Number(account.rentEpoch || 0),
					data: {
						program,
						parsed: program === "system" ? { type: "account", info: {} } : null,
						space,
					},
				};
			}

			return {
				lamports: Number(account.lamports),
				owner,
				data: [Buffer.from(account.data).toString("base64"), "base64"] as const,
				executable: account.executable,
				rentEpoch: Number(account.rentEpoch || 0),
			};
		} catch {
			return null;
		}
	});

	// Opportunistic index update
	try {
		const snaps: AccountSnapshot[] = [];
		for (const pubkeyStr of pubkeys) {
			try {
				const pubkey = new PublicKey(pubkeyStr);
				const acc = context.svm.getAccount(pubkey);
				if (!acc) continue;
				const owner = new PublicKey(acc.owner).toBase58();
				snaps.push({
					address: pubkey.toBase58(),
					lamports: Number(acc.lamports || 0n),
					ownerProgram: owner,
					executable: !!acc.executable,
					rentEpoch: Number(acc.rentEpoch || 0),
					dataLen: acc.data?.length ?? 0,
					dataBase64: undefined,
					lastSlot: Number(context.slot),
				});
			} catch {}
		}
		if (snaps.length) await context.store?.upsertAccounts(snaps);
	} catch {}

	return context.createSuccessResponse(id, {
		context: { slot: Number(context.slot) },
		value: accounts,
	});
};
