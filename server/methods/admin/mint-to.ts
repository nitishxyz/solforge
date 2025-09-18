import {
	ACCOUNT_SIZE,
	AccountLayout,
	createAssociatedTokenAccountInstruction,
	createMintToCheckedInstruction,
	getAssociatedTokenAddressSync,
	MINT_SIZE,
	MintLayout,
	TOKEN_2022_PROGRAM_ID,
	TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import type { TransactionInstruction } from "@solana/web3.js";
import {
	PublicKey,
	TransactionMessage,
	VersionedTransaction,
} from "@solana/web3.js";
import type { RpcMethodHandler } from "../../types";

// Mint via a real SPL Token transaction signed by faucet (must be mint authority)
export const solforgeMintTo: RpcMethodHandler = async (id, params, context) => {
	try {
		const [mintStr, ownerStr, rawAmount] = params as [
			string,
			string,
			number | string | bigint,
		];
		if (!mintStr || !ownerStr || rawAmount == null)
			return context.createErrorResponse(
				id,
				-32602,
				"Invalid params: mint, owner, amount required",
			);
		const mint = new PublicKey(mintStr);
		const owner = new PublicKey(ownerStr);
		const faucet = context.getFaucet();

		// Read mint to get decimals and authority
		const mintAcc = context.svm.getAccount(mint);
		if (!mintAcc)
			return context.createErrorResponse(
				id,
				-32004,
				"Mint not found in LiteSVM",
			);
		const mintInfo = MintLayout.decode(
			Buffer.from(mintAcc.data).slice(0, MINT_SIZE),
		);
		const decimals = mintInfo.decimals;
		const hasAuth = mintInfo.mintAuthorityOption === 1;
		const authPk = hasAuth ? new PublicKey(mintInfo.mintAuthority) : null;
		if (!hasAuth || !authPk || !authPk.equals(faucet.publicKey)) {
			return context.createErrorResponse(
				id,
				-32000,
				"Mint has no faucet authority; cannot mint real tokens",
			);
		}

		const ixs: TransactionInstruction[] = [];
		// Detect which token program the mint belongs to (SPL v1 vs Token-2022)
		const mintOwnerStr = (() => {
			try {
				return (mintAcc.owner as PublicKey).toBase58();
			} catch {
				return String(mintAcc.owner);
			}
		})();
		const tokenProgramId =
			mintOwnerStr === TOKEN_2022_PROGRAM_ID.toBase58()
				? TOKEN_2022_PROGRAM_ID
				: TOKEN_PROGRAM_ID;

		// Derive ATA using the correct token program
		const ata = getAssociatedTokenAddressSync(
			mint,
			owner,
			true,
			tokenProgramId,
		);
		const ataAcc = context.svm.getAccount(ata);

		// Ensure ATA exists under the correct token program
		if (!ataAcc || (ataAcc.data?.length ?? 0) < ACCOUNT_SIZE) {
			ixs.push(
				createAssociatedTokenAccountInstruction(
					faucet.publicKey,
					ata,
					owner,
					mint,
					tokenProgramId,
				),
			);
		}

		const amount =
			typeof rawAmount === "bigint" ? rawAmount : BigInt(rawAmount);
		ixs.push(
			createMintToCheckedInstruction(
				mint,
				ata,
				faucet.publicKey,
				amount,
				decimals,
				[],
				tokenProgramId,
			),
		);

		// Build a VersionedTransaction (legacy message) to ensure consistent encoding/decoding downstream
		let rb = context.svm.latestBlockhash();
		if (!rb || rb.length === 0) {
			const bh = new Uint8Array(32);
			crypto.getRandomValues(bh);
			rb = context.encodeBase58(bh);
		}
		const msg = new TransactionMessage({
			payerKey: faucet.publicKey,
			recentBlockhash: rb,
			instructions: ixs,
		});
		const legacy = msg.compileToLegacyMessage();
		const vtx = new VersionedTransaction(legacy);
		vtx.sign([faucet]);

		// Capture preBalances for primary accounts referenced and token pre amount
		const trackedKeys = [faucet.publicKey, ata, mint, owner];
		const preBalances = trackedKeys.map((pk) => {
			try {
				return Number(context.svm.getBalance(pk) || 0n);
			} catch {
				return 0;
			}
		});
		// Token mint decimals and pre amount
		let decsForMint = 0;
		let preTokenAmt: bigint = 0n;
		try {
			const mintAcc0 = context.svm.getAccount(mint);
			const mintInfo0 = mintAcc0
				? MintLayout.decode(Buffer.from(mintAcc0.data).slice(0, MINT_SIZE))
				: undefined;
			decsForMint = Number(mintInfo0?.decimals ?? decimals ?? 0);
			const ataAcc0 = context.svm.getAccount(ata);
			if (ataAcc0 && (ataAcc0.data?.length ?? 0) >= ACCOUNT_SIZE) {
				const dec0 = AccountLayout.decode(Buffer.from(ataAcc0.data));
				preTokenAmt = BigInt(dec0.amount.toString());
			}
		} catch {}

		// Send transaction via svm
		const _res = context.svm.sendTransaction(vtx);
		// Compute signature (base58) from the signed transaction
		let signatureStr = "";
		try {
			const sigBytes = vtx.signatures?.[0];
			if (sigBytes)
				signatureStr = context.encodeBase58(new Uint8Array(sigBytes));
		} catch {}
		if (!signatureStr) signatureStr = `mint:${ata.toBase58()}:${Date.now()}`;

		// Token balance deltas (pre/post) for ATA
		type UiTokenAmount = {
			amount: string;
			decimals: number;
			uiAmount: number;
			uiAmountString: string;
		};
		type TokenBalance = {
			accountIndex: number;
			mint: string;
			owner: string;
			uiTokenAmount: UiTokenAmount;
		};
		let preTokenBalances: TokenBalance[] = [];
		let postTokenBalances: TokenBalance[] = [];
		try {
			const decs = decsForMint;
			const ui = (n: bigint) => ({
				amount: n.toString(),
				decimals: decs,
				uiAmount: Number(n) / 10 ** decs,
				uiAmountString: (Number(n) / 10 ** decs).toString(),
			});
			const preAmt = preTokenAmt;
			const ataPostAcc = context.svm.getAccount(ata); // after send
			const postAmt =
				ataPostAcc && (ataPostAcc.data?.length ?? 0) >= ACCOUNT_SIZE
					? BigInt(
							AccountLayout.decode(
								Buffer.from(ataPostAcc.data),
							).amount.toString(),
						)
					: preAmt;
			const msgAny = vtx.message as unknown as {
				staticAccountKeys?: Array<string | PublicKey>;
				accountKeys?: Array<string | PublicKey>;
			};
			const rawKeys: Array<string | PublicKey> = Array.isArray(
				msgAny.staticAccountKeys,
			)
				? msgAny.staticAccountKeys
				: Array.isArray(msgAny.accountKeys)
					? msgAny.accountKeys
					: [];
			const keys = rawKeys.map((k: string | PublicKey) => {
				try {
					return typeof k === "string" ? k : new PublicKey(k).toBase58();
				} catch {
					return String(k);
				}
			});
			const ataIndex = keys.indexOf(ata.toBase58());
			preTokenBalances = [
				{
					accountIndex: ataIndex >= 0 ? ataIndex : 0,
					mint: mint.toBase58(),
					owner: owner.toBase58(),
					uiTokenAmount: ui(preAmt),
				},
			];
			postTokenBalances = [
				{
					accountIndex: ataIndex >= 0 ? ataIndex : 0,
					mint: mint.toBase58(),
					owner: owner.toBase58(),
					uiTokenAmount: ui(postAmt),
				},
			];
		} catch {}

		// Insert into DB for explorer via context.recordTransaction for richer details
		try {
			const rawBase64 = Buffer.from(vtx.serialize()).toString("base64");
			const postBalances = trackedKeys.map((pk) => {
				try {
					return Number(context.svm.getBalance(pk) || 0n);
				} catch {
					return 0;
				}
			});
			const logs: string[] = ["spl-token mintToChecked"];
			try {
				(vtx as unknown as { serialize: () => Uint8Array }).serialize = () =>
					Buffer.from(rawBase64, "base64");
			} catch {}
			context.recordTransaction(signatureStr, vtx, {
				logs,
				fee: 0,
				blockTime: Math.floor(Date.now() / 1000),
				preBalances,
				postBalances,
				preTokenBalances,
				postTokenBalances,
			});
		} catch {}
		try {
			context.notifySignature(signatureStr);
		} catch {}

		return context.createSuccessResponse(id, {
			ok: true,
			signature: signatureStr,
			mint: mintStr,
			owner: ownerStr,
			amount: amount.toString(),
		});
	} catch (e) {
		return context.createErrorResponse(
			id,
			-32603,
			"MintTo failed",
			(e as Error)?.message || String(e),
		);
	}
};

export type { RpcMethodHandler } from "../../types";
