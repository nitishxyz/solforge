import { LiteSVM } from "litesvm";
import { Keypair, VersionedTransaction, PublicKey } from "@solana/web3.js";
import { rpcMethods } from "./methods";
import type { JsonRpcRequest, JsonRpcResponse, RpcMethodContext } from "./types";
import { TxStore } from "../src/db/tx-store";
import { encodeBase58, decodeBase58 } from "./lib/base58";

export class LiteSVMRpcServer {
  private svm: LiteSVM;
  private slot: bigint = 1n;
  private blockHeight: bigint = 1n;
  private txCount: bigint = 0n;
  private signatureListeners: Set<(sig: string) => void> = new Set();
  private faucet: Keypair;
  private txRecords: Map<string, { tx: VersionedTransaction; logs: string[]; err: unknown; fee: number; slot: number; blockTime?: number; preBalances?: number[]; postBalances?: number[] } > = new Map();
  private store: TxStore;

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
    this.store = new TxStore();

    // Create and pre-fund a faucet for real airdrop transfers
    this.faucet = Keypair.generate();
    try {
      // Fund faucet using svm's internal airdrop once at startup
      this.svm.airdrop(this.faucet.publicKey, 10_000_000_000_000n); // 10k SOL
    } catch {}
  }

  // base58 helpers moved to server/lib/base58

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
      store: this.store,
      encodeBase58,
      decodeBase58,
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

        // Persist to SQLite for durability and history queries
        try {
          const msg: any = tx.message as any;
          const keys: string[] = (msg.staticAccountKeys || []).map((k: any) => {
            try { return typeof k === "string" ? k : (k as PublicKey).toBase58(); } catch { return String(k); }
          });
          const header = msg.header || { numRequiredSignatures: (tx.signatures || []).length, numReadonlySignedAccounts: 0, numReadonlyUnsignedAccounts: 0 };
          const numReq = Number(header.numRequiredSignatures || 0);
          const numRoSigned = Number(header.numReadonlySignedAccounts || 0);
          const numRoUnsigned = Number(header.numReadonlyUnsignedAccounts || 0);
          const total = keys.length;
          const unsignedCount = Math.max(0, total - numReq);
          const writableSignedCutoff = Math.max(0, numReq - numRoSigned);
          const writableUnsignedCount = Math.max(0, unsignedCount - numRoUnsigned);

          const accounts = keys.map((addr, i) => {
            const signer = typeof msg.isAccountSigner === "function" ? !!msg.isAccountSigner(i) : i < numReq;
            let writable = true;
            if (typeof msg.isAccountWritable === "function") writable = !!msg.isAccountWritable(i);
            else {
              if (i < numReq) writable = i < writableSignedCutoff; else writable = (i - numReq) < writableUnsignedCount;
            }
            return { address: addr, index: i, signer, writable };
          });
          const version: 0 | "legacy" = (typeof msg.version === "number" ? (msg.version === 0 ? 0 : "legacy") : 0);
          const rawBase64 = Buffer.from(tx.serialize()).toString("base64");
          this.store.insertTransactionBundle({
            signature,
            slot: Number(this.slot),
            blockTime: meta?.blockTime,
            version,
            fee: Number(meta?.fee ?? 5000),
            err: meta?.err ?? null,
            rawBase64,
            preBalances: Array.isArray(meta?.preBalances) ? meta!.preBalances! : [],
            postBalances: Array.isArray(meta?.postBalances) ? meta!.postBalances! : [],
            logs: Array.isArray(meta?.logs) ? meta!.logs! : [],
            accounts
          }).catch(() => {});

          // Upsert account snapshots for static keys
          const snapshots = keys.map((addr) => {
            try {
              const acc = this.svm.getAccount(new PublicKey(addr));
              if (!acc) return null;
              return {
                address: addr,
                lamports: Number(acc.lamports || 0n),
                ownerProgram: new PublicKey(acc.owner).toBase58(),
                executable: !!acc.executable,
                rentEpoch: Number(acc.rentEpoch || 0),
                dataLen: (acc.data?.length ?? 0),
                dataBase64: undefined,
                lastSlot: Number(this.slot)
              };
            } catch { return null; }
          }).filter(Boolean) as any[];
          if (snapshots.length > 0) this.store.upsertAccounts(snapshots).catch(() => {});
        } catch {}
      },
      getRecordedTransaction: (signature) => this.txRecords.get(signature)
    };
  }

  onSignatureRecorded(cb: (sig: string) => void) {
    this.signatureListeners.add(cb);
    return () => this.signatureListeners.delete(cb);
  }

  getSignatureStatus(signature: string): { slot: number; err: any | null } | null {
    // Prefer local record for reliability
    const rec = this.txRecords.get(signature);
    if (rec) {
      return { slot: rec.slot, err: rec.err ?? null };
    }
    try {
      const sigBytes = decodeBase58(signature);
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
      const DEBUG = process.env.DEBUG_RPC_LOG === "1";
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
            if (DEBUG) {
              try { console.log("RPC batch:", body.map((b: any) => b.method)); } catch {}
            }
            const responses = await Promise.all(
              body.map(request => server.handleRequest(request))
            );
            return new Response(JSON.stringify(responses), { headers: { "Content-Type": "application/json", ...corsHeaders } });
          } else {
            const reqObj = body as JsonRpcRequest;
            if (DEBUG) {
              try { console.log("RPC:", reqObj.method, JSON.stringify(reqObj.params)); } catch {}
            }
            const response = await server.handleRequest(reqObj);
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
