import { MINT_SIZE, MintLayout } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { formatUiAmount } from "../../lib/spl-token";
import type { RpcMethodHandler } from "../../types";

const LAMPORTS_PER_SOL = 1_000_000_000n;

function formatLamports(lamports: bigint) {
	const sol = Number(lamports) / Number(LAMPORTS_PER_SOL);
	return {
		lamports: lamports.toString(),
		sol,
	};
}

export const solforgeGetStatus: RpcMethodHandler = async (
	id,
	_params,
	context,
) => {
	try {
		const latestBlockhash = (() => {
			try {
				return context.svm.latestBlockhash();
			} catch {
				return "";
			}
		})();
		const faucet = context.getFaucet();
		let faucetLamports = 0n;
		try {
			faucetLamports =
				context.svm.getBalance(faucet.publicKey as PublicKey) ?? 0n;
		} catch {}

		return context.createSuccessResponse(id, {
			slot: Number(context.slot),
			slotBigint: context.slot.toString(),
			blockHeight: Number(context.blockHeight),
			blockHeightBigint: context.blockHeight.toString(),
			txCount: Number(context.getTxCount()),
			txCountBigint: context.getTxCount().toString(),
			latestBlockhash,
			faucet: {
				address: faucet.publicKey.toBase58(),
				...formatLamports(faucetLamports),
			},
		});
	} catch (error: any) {
		return context.createErrorResponse(
			id,
			-32603,
			"Status unavailable",
			error?.message || String(error),
		);
	}
};

export const solforgeListPrograms: RpcMethodHandler = async (
	id,
	_params,
	context,
) => {
	try {
		const programs = context.listPrograms ? context.listPrograms() : [];
		const detailed = programs
			.map((programId) => {
				try {
					const info = context.svm.getAccount(new PublicKey(programId));
					if (!info) return null;
					const owner = (() => {
						try {
							return (info.owner as PublicKey).toBase58();
						} catch {
							return String(info.owner);
						}
					})();
					const lamports = BigInt(info.lamports ?? 0);
					return {
						programId,
						owner,
						executable: !!info.executable,
						dataLen: info.data?.length ?? 0,
						lamports: lamports.toString(),
					};
				} catch {
					return null;
				}
			})
			.filter(Boolean);

		return context.createSuccessResponse(id, detailed);
	} catch (error: any) {
		return context.createErrorResponse(
			id,
			-32603,
			"List programs failed",
			error?.message || String(error),
		);
	}
};

export const solforgeListTokensDetailed: RpcMethodHandler = async (
	id,
	_params,
	context,
) => {
	try {
		const mints = context.listMints ? context.listMints() : [];
		const detailed = mints
			.map((mint) => {
				try {
					const info = context.svm.getAccount(new PublicKey(mint));
					if (!info) return null;
					const data = Buffer.from(info.data?.slice(0, MINT_SIZE) ?? []);
					if (data.length < MINT_SIZE) return null;
					const decoded = MintLayout.decode(data);
					const supply = BigInt(decoded.supply.toString());
					const decimals = Number(decoded.decimals ?? 0);
					const ui = formatUiAmount(supply, decimals);
					const hasAuthority = decoded.mintAuthorityOption === 1;
					const authority = hasAuthority
						? (() => {
								try {
									return new PublicKey(decoded.mintAuthority).toBase58();
								} catch {
									return null;
								}
							})()
						: null;
					return {
						mint,
						supply: supply.toString(),
						decimals,
						uiAmount: ui.uiAmount,
						uiAmountString: ui.uiAmountString,
						mintAuthority: authority,
						isInitialized: decoded.isInitialized ?? false,
					};
				} catch {
					return null;
				}
			})
			.filter(Boolean);

		return context.createSuccessResponse(id, detailed);
	} catch (error: any) {
		return context.createErrorResponse(
			id,
			-32603,
			"List tokens failed",
			error?.message || String(error),
		);
	}
};
