import { LiteSVM } from "litesvm";
import { Keypair, VersionedTransaction } from "@solana/web3.js";
import { rpcMethods } from "./methods";
import type { JsonRpcRequest, JsonRpcResponse, RpcMethodContext } from "./types";

export class LiteSVMRpcServer {
  private svm: LiteSVM;
  private slot: bigint = 1n;
  private blockHeight: bigint = 1n;
  private txCount: bigint = 0n;
  private signatureListeners: Set<(sig: string) => void> = new Set();
  private faucet: Keypair;
  private txRecords: Map<string, { tx: VersionedTransaction; logs: string[]; err: unknown; fee: number; slot: number; blockTime?: number; preBalances?: number[]; postBalances?: number[] } > = new Map();

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

    // Create and pre-fund a faucet for real airdrop transfers
    this.faucet = Keypair.generate();
    try {
      // Fund faucet using svm's internal airdrop once at startup
      this.svm.airdrop(this.faucet.publicKey, 10_000_000_000_000n); // 10k SOL
    } catch {}
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
      notifySignature: (signature: string) => { for (const cb of this.signatureListeners) cb(signature); },
      getFaucet: () => this.faucet,
      getTxCount: () => this.txCount,
      recordTransaction: (signature, tx, meta) => {
        this.txRecords.set(signature, {
          tx,
          logs: meta?.logs || [],
          err: meta?.err ?? null,
          fee: meta?.fee ?? 5000,
          slot: Number(this.slot),
          blockTime: meta?.blockTime,
          preBalances: meta?.preBalances,
          postBalances: meta?.postBalances
        });
      },
      getRecordedTransaction: (signature) => this.txRecords.get(signature)
    };
  }

  onSignatureRecorded(cb: (sig: string) => void) {
    this.signatureListeners.add(cb);
    return () => this.signatureListeners.delete(cb);
  }

  getSignatureStatus(signature: string): { slot: number; err: any | null } | null {
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
        this.txCount += 1n;
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
      const acrh = req.headers.get("Access-Control-Request-Headers");
      const allowHeaders = acrh && acrh.length > 0 
        ? acrh 
        : "Content-Type, Accept, Origin, solana-client";
      const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS, HEAD",
        "Access-Control-Allow-Headers": allowHeaders,
        "Access-Control-Max-Age": "600",
        // Help Chrome when accessing local network/localhost from secure context
        "Access-Control-Allow-Private-Network": "true"
      } as const;
      
      if (req.method === "GET") {
        const url = new URL(req.url);
        if (url.pathname === "/" || url.pathname === "") {
          return new Response("ok", { headers: { "Content-Type": "text/plain", ...corsHeaders } });
        }
        if (url.pathname === "/health") {
          return new Response("ok", { headers: { "Content-Type": "text/plain", ...corsHeaders } });
        }
        return new Response("Not found", { status: 404, headers: corsHeaders });
      }
      if (req.method === "POST") {
        try {
          const body = await req.json();
          
          if (Array.isArray(body)) {
            const responses = await Promise.all(
              body.map(request => server.handleRequest(request))
            );
            return new Response(JSON.stringify(responses), { headers: { "Content-Type": "application/json", ...corsHeaders } });
          } else {
            const response = await server.handleRequest(body as JsonRpcRequest);
            return new Response(JSON.stringify(response), { headers: { "Content-Type": "application/json", ...corsHeaders } });
          }
        } catch (error) {
          return new Response(JSON.stringify({
            jsonrpc: "2.0",
            id: null,
            error: {
              code: -32700,
              message: "Parse error"
            }
          }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
        }
      }

      if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
      }
      if (req.method === "HEAD") {
        return new Response(null, { headers: corsHeaders });
      }

      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
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
