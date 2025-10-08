import type { Keypair, PublicKey, VersionedTransaction } from "@solana/web3.js";
import type { LiteSVM } from "litesvm";
import type { TxStore } from "./db/tx-store";

export interface JsonRpcRequest {
	jsonrpc: "2.0";
	id: string | number;
	method: string;
	params?: unknown;
}

export interface JsonRpcResponse {
	jsonrpc: "2.0";
	id: string | number;
	result?: unknown;
	error?: {
		code: number;
		message: string;
		data?: unknown;
	};
}

export interface RpcMethodContext {
	svm: LiteSVM;
	slot: bigint;
	blockHeight: bigint;
	store?: TxStore;
	encodeBase58: (bytes: Uint8Array) => string;
	decodeBase58: (str: string) => Uint8Array;
	createSuccessResponse: (
		id: string | number,
		result: unknown,
	) => JsonRpcResponse;
	createErrorResponse: (
		id: string | number,
		code: number,
		message: string,
		data?: unknown,
	) => JsonRpcResponse;
	notifySignature: (signature: string) => void;
	getFaucet: () => Keypair;
	getTxCount: () => bigint;
	registerMint?: (mint: PublicKey | string) => void;
	listMints?: () => string[];
	registerProgram?: (program: PublicKey | string) => void;
	listPrograms?: () => string[];
	recordTransaction: (
		signature: string,
		tx: VersionedTransaction,
		meta?: {
			logs?: string[];
			err?: unknown;
			fee?: number;
			blockTime?: number;
			preBalances?: number[];
			postBalances?: number[];
			preTokenBalances?: unknown[];
			postTokenBalances?: unknown[];
			innerInstructions?: unknown[];
			computeUnits?: number | bigint | null;
			returnData?: { programId: string; dataBase64: string } | null;
			// Optional rich per-account snapshots captured around execution
			accountStates?: Array<{
				address: string;
				pre?: {
					lamports?: number;
					ownerProgram?: string;
					executable?: boolean;
					rentEpoch?: number;
					dataLen?: number;
					dataBase64?: string | null;
					lastSlot?: number;
				} | null;
				post?: {
					lamports?: number;
					ownerProgram?: string;
					executable?: boolean;
					rentEpoch?: number;
					dataLen?: number;
					dataBase64?: string | null;
					lastSlot?: number;
				} | null;
			}>;
		},
	) => void;
	getRecordedTransaction: (signature: string) =>
		| {
				tx: VersionedTransaction;
				logs: string[];
				err: unknown;
				fee: number;
				slot: number;
				blockTime?: number;
				preBalances?: number[];
				postBalances?: number[];
				preTokenBalances?: unknown[];
				postTokenBalances?: unknown[];
				innerInstructions?: unknown[];
				computeUnits?: number | null;
				returnData?: { programId: string; dataBase64: string } | null;
		  }
		| undefined;
}

export type RpcMethodHandler = (
	id: string | number,
	params: unknown[] | undefined,
	context: RpcMethodContext,
) => JsonRpcResponse | Promise<JsonRpcResponse>;
