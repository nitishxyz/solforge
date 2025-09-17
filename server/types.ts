import type { Keypair, PublicKey, VersionedTransaction } from "@solana/web3.js";
import type { LiteSVM } from "litesvm";
import type { TxStore } from "../src/db/tx-store";

export interface JsonRpcRequest {
	jsonrpc: "2.0";
	id: string | number;
	method: string;
	params?: any;
}

export interface JsonRpcResponse {
	jsonrpc: "2.0";
	id: string | number;
	result?: any;
	error?: {
		code: number;
		message: string;
		data?: any;
	};
}

export interface RpcMethodContext {
	svm: LiteSVM;
	slot: bigint;
	blockHeight: bigint;
	store?: TxStore;
	encodeBase58: (bytes: Uint8Array) => string;
	decodeBase58: (str: string) => Uint8Array;
	createSuccessResponse: (id: string | number, result: any) => JsonRpcResponse;
	createErrorResponse: (
		id: string | number,
		code: number,
		message: string,
		data?: any,
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
		  }
		| undefined;
}

export type RpcMethodHandler = (
	id: string | number,
	params: any,
	context: RpcMethodContext,
) => JsonRpcResponse | Promise<JsonRpcResponse>;
