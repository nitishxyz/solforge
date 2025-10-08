import { Connection, PublicKey } from "@solana/web3.js";
import type { RpcMethodHandler } from "../../types";
import { parseUpgradeableLoader } from "../account/parsers/loader-upgradeable";

export const solforgeAdminCloneProgram: RpcMethodHandler = async (
	id,
	params,
	context,
) => {
	const [programId, options] = params as [
		string,
		{ endpoint?: string; withAccounts?: boolean; accountsLimit?: number }?,
	];
	if (!programId)
		return context.createErrorResponse(
			id,
			-32602,
			"Invalid params: programId required",
		);
	const endpoint = options?.endpoint || "https://api.mainnet-beta.solana.com";
	try {
		const conn = new Connection(endpoint, "confirmed");
		const pid = new PublicKey(programId);
		const info = await conn.getAccountInfo(pid, "confirmed");
		if (!info)
			return context.createErrorResponse(
				id,
				-32004,
				"Program account not found on endpoint",
				{ programId, endpoint },
			);

		console.log("[admin] clone program start", {
			programId: pid.toBase58(),
			owner: info.owner.toBase58(),
			exec: info.executable,
			dataLen: info.data?.length ?? 0,
		});
		const ownerStr = info.owner.toBase58();
		let addSource: "programData" | "program" | null = null;

		// If upgradeable loader: fetch program data, extract ELF and addProgram
		const parsed = parseUpgradeableLoader(
			ownerStr,
			new Uint8Array(info.data),
			context,
		);
		if (parsed?.parsed?.type === "program") {
			const programDataAddr = parsed.parsed.info?.programData as
				| string
				| undefined;
			if (programDataAddr) {
				const pda = new PublicKey(programDataAddr);
				const pinfo = await conn.getAccountInfo(pda, "confirmed");
				if (pinfo) {
					const pdataParsed = parseUpgradeableLoader(
						ownerStr,
						new Uint8Array(pinfo.data),
						context,
					);
					const base64 = pdataParsed?.parsed?.info?.data?.[0] as
						| string
						| undefined;
					if (base64) {
						const bytes = Uint8Array.from(Buffer.from(base64, "base64"));
						try {
							context.svm.addProgram(pid, bytes);
							addSource = "programData";
						} catch (e) {
							console.warn("[admin] addProgram failed (programData bytes)", e);
							return context.createErrorResponse(
								id,
								-32603,
								"Clone program failed",
								{
									message: String(e),
									programId,
									endpoint,
									source: "programData",
								},
							);
						}
					} else {
						console.warn("[admin] programData bytes missing");
						return context.createErrorResponse(
							id,
							-32603,
							"Clone program failed",
							{
								message: "ProgramData bytes missing",
								programId,
								endpoint,
							},
						);
					}
				}
			}
		} else {
			// Legacy loaders keep ELF in the program account directly
			try {
				context.svm.addProgram(pid, new Uint8Array(info.data));
				addSource = "program";
			} catch (e) {
				console.warn("[admin] addProgram failed (program account data)", e);
				return context.createErrorResponse(id, -32603, "Clone program failed", {
					message: String(e),
					programId,
					endpoint,
					source: "program",
				});
			}
		}

		// Optionally clone owned accounts
		if (options?.withAccounts) {
			const { solforgeAdminCloneProgramAccounts } = await import(
				"./clone-program-accounts"
			);
			const res = await solforgeAdminCloneProgramAccounts(
				id,
				[programId, { endpoint, limit: options.accountsLimit }],
				context,
			);
			void res;
		}

		console.log("[admin] clone program done", {
			programId: pid.toBase58(),
			added: true,
			source: addSource,
		});
		try {
			context.registerProgram?.(pid);
		} catch {}
		return context.createSuccessResponse(id, {
			ok: true,
			programId,
			added: true,
			source: addSource,
		});
	} catch (e) {
		console.error("[admin] clone program error", e);
		return context.createErrorResponse(id, -32603, "Clone program failed", {
			message: (e as Error)?.message || String(e),
			stack: (e as Error)?.stack,
			programId,
			endpoint,
		});
	}
};

export type { RpcMethodHandler } from "../../types";
