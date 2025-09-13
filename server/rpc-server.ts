import { LiteSVM } from "litesvm";
import { rpcMethods } from "./methods";
import type { JsonRpcRequest, JsonRpcResponse, RpcMethodContext } from "./types";

export class LiteSVMRpcServer {
  private svm: LiteSVM;
  private slot: bigint = 1n;
  private blockHeight: bigint = 1n;
  private localSignatures: Map<string, { slot: bigint; err: any | null; confirmationStatus: "processed"|"confirmed"|"finalized" }> = new Map();
  private signatureListeners: Set<(sig: string) => void> = new Set();

  constructor() {
    this.svm = new LiteSVM()
      .withSysvars()
      .withBuiltins()
      .withDefaultPrograms()
      .withLamports(1000000000000n)
      .withBlockhashCheck(false)
      // keep some tx history so getTransaction/getSignatureStatuses can work
      .withTransactionHistory(1000n)
      .withSigverify(false);
  }

  private encodeBase58(bytes: Uint8Array): string {
    const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    const base = BigInt(ALPHABET.length);
    
    let num = 0n;
    for (let i = 0; i < bytes.length; i++) {
      num = num * 256n + BigInt(bytes[i] || 0);
    }
    
    let encoded = "";
    while (num > 0n) {
      const remainder = num % base;
      num = num / base;
      encoded = ALPHABET[Number(remainder)] + encoded;
    }
    
    for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
      encoded = "1" + encoded;
    }
    
    return encoded || "1";
  }

  private decodeBase58(str: string): Uint8Array {
    const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    const base = BigInt(ALPHABET.length);
    
    let num = 0n;
    for (const char of str) {
      const index = ALPHABET.indexOf(char);
      if (index === -1) throw new Error("Invalid base58 character");
      num = num * base + BigInt(index);
    }
    
    const bytes = [];
    while (num > 0n) {
      bytes.unshift(Number(num % 256n));
      num = num / 256n;
    }
    
    for (let i = 0; i < str.length && str[i] === "1"; i++) {
      bytes.unshift(0);
    }
    
    return new Uint8Array(bytes.length > 0 ? bytes : [0]);
  }

  private createSuccessResponse(id: string | number, result: any): JsonRpcResponse {
    return {
      jsonrpc: "2.0",
      id,
      result
    };
  }

  private createErrorResponse(
    id: string | number, 
    code: number, 
    message: string, 
    data?: any
  ): JsonRpcResponse {
    return {
      jsonrpc: "2.0",
      id,
      error: { code, message, data }
    };
  }

  private getContext(): RpcMethodContext {
    return {
      svm: this.svm,
      slot: this.slot,
      blockHeight: this.blockHeight,
      encodeBase58: this.encodeBase58.bind(this),
      decodeBase58: this.decodeBase58.bind(this),
      createSuccessResponse: this.createSuccessResponse.bind(this),
      createErrorResponse: this.createErrorResponse.bind(this),
      getLocalSignatureStatus: (signature: string) => this.localSignatures.get(signature),
      recordLocalSignature: (signature, status) => {
        this.localSignatures.set(signature, status);
        for (const cb of this.signatureListeners) cb(signature);
      }
    };
  }

  onSignatureRecorded(cb: (sig: string) => void) {
    this.signatureListeners.add(cb);
    return () => this.signatureListeners.delete(cb);
  }

  getSignatureStatus(signature: string): { slot: number; err: any | null } | null {
    const local = this.localSignatures.get(signature);
    if (local) return { slot: Number(local.slot), err: local.err };
    try {
      const sigBytes = this.decodeBase58(signature);
      const tx = this.svm.getTransaction(sigBytes);
      if (!tx) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let errVal: any = null;
      try { errVal = ("err" in tx) ? (tx as any).err() : null; } catch { errVal = null; }
      return { slot: Number(this.slot), err: errVal };
    } catch {
      return null;
    }
  }

  async handleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const { method, params, id } = request;

    try {
      const methodHandler = rpcMethods[method];
      
      if (!methodHandler) {
        return this.createErrorResponse(
          id,
          -32601,
          `Method not found: ${method}`
        );
      }

      const context = this.getContext();
      const result = await methodHandler(id, params, context);
      
      // Update slot and blockHeight for methods that modify state
      if (["sendTransaction", "requestAirdrop"].includes(method)) {
        this.slot += 1n;
        this.blockHeight += 1n;
      }
      
      return result;
    } catch (error: any) {
      return this.createErrorResponse(
        id,
        -32603,
        "Internal error",
        error.message
      );
    }
  }
}

export function createLiteSVMRpcServer(port: number = 8899) {
  const server = new LiteSVMRpcServer();

  const bunServer = Bun.serve({
    port,
    async fetch(req) {
      if (req.method === "POST") {
        try {
          const body = await req.json();
          
          if (Array.isArray(body)) {
            const responses = await Promise.all(
              body.map(request => server.handleRequest(request))
            );
            return Response.json(responses);
          } else {
            const response = await server.handleRequest(body as JsonRpcRequest);
            return Response.json(response);
          }
        } catch (error) {
          return Response.json({
            jsonrpc: "2.0",
            id: null,
            error: {
              code: -32700,
              message: "Parse error"
            }
          });
        }
      }

      if (req.method === "OPTIONS") {
        return new Response(null, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
          }
        });
      }

      return new Response("Method not allowed", { status: 405 });
    },
    error(error) {
      console.error("Server error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  });

  console.log(`🚀 LiteSVM RPC Server running on http://localhost:${port}`);
  console.log(`   Compatible with Solana RPC API`);
  console.log(`   Use with: solana config set -u http://localhost:${port}`);
  
  return { httpServer: bunServer, rpcServer: server };
}
