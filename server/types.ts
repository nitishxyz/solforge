import { LiteSVM } from "litesvm";
import type { Keypair } from "@solana/web3.js";

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
  encodeBase58: (bytes: Uint8Array) => string;
  decodeBase58: (str: string) => Uint8Array;
  createSuccessResponse: (id: string | number, result: any) => JsonRpcResponse;
  createErrorResponse: (
    id: string | number, 
    code: number, 
    message: string, 
    data?: any
  ) => JsonRpcResponse;
  notifySignature: (signature: string) => void;
  getFaucet: () => Keypair;
}

export type RpcMethodHandler = (
  id: string | number, 
  params: any,
  context: RpcMethodContext
) => JsonRpcResponse | Promise<JsonRpcResponse>;
