import { PublicKey } from "@solana/web3.js";
import type { RpcMethodHandler } from "../../types";

// Load a program ELF into LiteSVM for a given programId
export const solforgeLoadProgram: RpcMethodHandler = async (
	id,
	params,
	context,
) => {
	try {
		const [programIdStr, elfBase64] = params as [string, string];
		if (!programIdStr || !elfBase64)
			return context.createErrorResponse(
				id,
				-32602,
				"Invalid params: programId, base64 required",
			);
		const pid = new PublicKey(programIdStr);
		const bytes = Uint8Array.from(Buffer.from(elfBase64, "base64"));
		try {
			context.svm.addProgram(pid, bytes);
		} catch {}
		// Mirror program account metadata as executable; owner = upgradeable loader for realism
		const LOADER_UPGRADEABLE = new PublicKey(
			"BPFLoaderUpgradeab1e11111111111111111111111",
		);
		context.svm.setAccount(pid, {
			lamports: 1_000_000_000,
			data: new Uint8Array(bytes.length), // minimal stub data for the program account itself
			owner: LOADER_UPGRADEABLE,
			executable: true,
			rentEpoch: 0,
		});
		try {
			context.registerProgram?.(pid);
		} catch {}
		return context.createSuccessResponse(id, {
			ok: true,
			programId: programIdStr,
			size: bytes.length,
		});
	} catch (e) {
		return context.createErrorResponse(
			id,
			-32603,
			"Load program failed",
			(e as Error)?.message || String(e),
		);
	}
};

export type { RpcMethodHandler } from "../../types";
