import { LiteSVM } from "litesvm";
import { Keypair, VersionedTransaction, PublicKey } from "@solana/web3.js";
import { rpcMethods } from "./methods";
import type {
  JsonRpcRequest,
  JsonRpcResponse,
  RpcMethodContext,
} from "./types";
import { TxStore } from "../src/db/tx-store";
import { sqlite } from "../src/db/index";
import { encodeBase58, decodeBase58 } from "./lib/base58";
import { loadOrCreateFaucet, fundFaucetIfNeeded } from "./lib/faucet";

export class LiteSVMRpcServer {
  private svm: LiteSVM;
  private slot: bigint = 1n;
  private blockHeight: bigint = 1n;
  private txCount: bigint = 0n;
  private signatureListeners: Set<(sig: string) => void> = new Set();
  private knownMints: Set<string> = new Set();
  private faucet: Keypair;
  private txRecords: Map<
    string,
    {
      tx: VersionedTransaction;
      logs: string[];
      err: unknown;
      fee: number;
      slot: number;
      blockTime?: number;
      preBalances?: number[];
      postBalances?: number[];
      preTokenBalances?: any[];
      postTokenBalances?: any[];
    }
  > = new Map();
  private store: TxStore;

  constructor() {
    this.svm = new LiteSVM()
      .withSysvars()
      .withBuiltins()
      .withDefaultPrograms()
      // Mint 1,000,000 SOL (1e15 lamports) for local dev
      .withLamports(1_000_000_000_000_000n)
      .withBlockhashCheck(true)
      // keep some tx history so getTransaction/getSignatureStatuses can work
      .withTransactionHistory(1000n)
      .withSigverify(false);
    this.store = new TxStore();
    // Seed slot/blockHeight/txCount from DB if available for continuity
    try {
      const maxRow = sqlite
        .prepare("SELECT MAX(slot) as m FROM transactions")
        .get() as { m?: number } | undefined;
      const cntRow = sqlite
        .prepare("SELECT COUNT(1) as c FROM transactions")
        .get() as { c?: number } | undefined;
      const maxSlot = (maxRow?.m ?? 0) as number;
      const txc = (cntRow?.c ?? 0) as number;
      if (maxSlot > 0) {
        this.slot = BigInt(maxSlot + 1);
        this.blockHeight = BigInt(maxSlot + 1);
      }
      if (txc > 0) {
        this.txCount = BigInt(txc);
      }
    } catch {}

    // Load or create faucet; fund once at startup
    this.faucet = loadOrCreateFaucet();
    try {
      const bal = fundFaucetIfNeeded(this.svm, this.faucet);
      console.log(
        `💧 Faucet loaded: ${this.faucet.publicKey.toBase58()} with ${(Number(bal) / 1_000_000_000).toFixed(0)} SOL`,
      );
    } catch (e) {
      console.warn("⚠️ Faucet funding failed:", e);
      try {
        const bal =
          this.svm.getBalance(this.faucet.publicKey as PublicKey) || 0n;
        console.log(
          `💧 Faucet balance: ${(Number(bal) / 1_000_000_000).toFixed(9)} SOL`,
        );
      } catch {}
    }
  }

  // base58 helpers moved to server/lib/base58

  private createSuccessResponse(
    id: string | number,
    result: any,
  ): JsonRpcResponse {
    return {
      jsonrpc: "2.0",
      id,
      result,
    };
  }

  private createErrorResponse(
    id: string | number,
    code: number,
    message: string,
    data?: any,
  ): JsonRpcResponse {
    return {
      jsonrpc: "2.0",
      id,
      error: { code, message, data },
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
      notifySignature: (signature: string) => {
        for (const cb of this.signatureListeners) cb(signature);
      },
      getFaucet: () => this.faucet,
      getTxCount: () => this.txCount,
      registerMint: (mint: any) => {
        try {
          const pk = typeof mint === "string" ? mint : new PublicKey(mint).toBase58();
          this.knownMints.add(pk);
        } catch {}
      },
      listMints: () => Array.from(this.knownMints),
      recordTransaction: (signature, tx, meta) => {
        this.txRecords.set(signature, {
          tx,
          logs: meta?.logs || [],
          err: meta?.err ?? null,
          fee: meta?.fee ?? 5000,
          slot: Number(this.slot),
          blockTime: meta?.blockTime,
          preBalances: meta?.preBalances,
          postBalances: meta?.postBalances,
          preTokenBalances: (meta as any)?.preTokenBalances,
          postTokenBalances: (meta as any)?.postTokenBalances,
        });

        // Persist to SQLite for durability and history queries
        try {
          const msg: any = tx.message as any;
          const rawKeys: any[] = Array.isArray(msg.staticAccountKeys)
            ? msg.staticAccountKeys
            : (Array.isArray(msg.accountKeys) ? msg.accountKeys : []);
          const keys: string[] = rawKeys.map((k: any) => {
            try {
              return typeof k === "string" ? k : (k as PublicKey).toBase58();
            } catch {
              return String(k);
            }
          });
          const header = msg.header || {
            numRequiredSignatures: (tx.signatures || []).length,
            numReadonlySignedAccounts: 0,
            numReadonlyUnsignedAccounts: 0,
          };
          const numReq = Number(header.numRequiredSignatures || 0);
          const numRoSigned = Number(header.numReadonlySignedAccounts || 0);
          const numRoUnsigned = Number(header.numReadonlyUnsignedAccounts || 0);
          const total = keys.length;
          const unsignedCount = Math.max(0, total - numReq);
          const writableSignedCutoff = Math.max(0, numReq - numRoSigned);
          const writableUnsignedCount = Math.max(
            0,
            unsignedCount - numRoUnsigned,
          );

          const accounts = keys.map((addr, i) => {
            const signer =
              typeof msg.isAccountSigner === "function"
                ? !!msg.isAccountSigner(i)
                : i < numReq;
            let writable = true;
            if (typeof msg.isAccountWritable === "function")
              writable = !!msg.isAccountWritable(i);
            else {
              if (i < numReq) writable = i < writableSignedCutoff;
              else writable = i - numReq < writableUnsignedCount;
            }
            return { address: addr, index: i, signer, writable };
          });
          const version: 0 | "legacy" =
            typeof msg.version === "number"
              ? msg.version === 0
                ? 0
                : "legacy"
              : 0;
          const rawBase64 = Buffer.from(tx.serialize()).toString("base64");
          this.store
            .insertTransactionBundle({
              signature,
              slot: Number(this.slot),
              blockTime: meta?.blockTime,
              version,
              fee: Number(meta?.fee ?? 5000),
              err: meta?.err ?? null,
              rawBase64,
              preBalances: Array.isArray(meta?.preBalances)
                ? meta!.preBalances!
                : [],
              postBalances: Array.isArray(meta?.postBalances)
                ? meta!.postBalances!
                : [],
              logs: Array.isArray(meta?.logs) ? meta!.logs! : [],
              preTokenBalances: Array.isArray((meta as any)?.preTokenBalances) ? (meta as any).preTokenBalances : [],
              postTokenBalances: Array.isArray((meta as any)?.postTokenBalances) ? (meta as any).postTokenBalances : [],
              accounts,
            })
            .catch(() => {});

          // Upsert account snapshots for static keys
          const snapshots = keys
            .map((addr) => {
              try {
                const acc = this.svm.getAccount(new PublicKey(addr));
                if (!acc) return null;
                return {
                  address: addr,
                  lamports: Number(acc.lamports || 0n),
                  ownerProgram: new PublicKey(acc.owner).toBase58(),
                  executable: !!acc.executable,
                  rentEpoch: Number(acc.rentEpoch || 0),
                  dataLen: acc.data?.length ?? 0,
                  dataBase64: undefined,
                  lastSlot: Number(this.slot),
                };
              } catch {
                return null;
              }
            })
            .filter(Boolean) as any[];
          if (snapshots.length > 0)
            this.store.upsertAccounts(snapshots).catch(() => {});
        } catch {}
      },
      getRecordedTransaction: (signature) => this.txRecords.get(signature),
    };
  }

  onSignatureRecorded(cb: (sig: string) => void) {
    this.signatureListeners.add(cb);
    return () => this.signatureListeners.delete(cb);
  }

  getSignatureStatus(
    signature: string,
  ): { slot: number; err: any | null } | null {
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
      try {
        errVal = "err" in tx ? (tx as any).err() : null;
      } catch {
        errVal = null;
      }
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
          `Method not found: ${method}`,
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
        error.message,
      );
    }
  }
}

export function createLiteSVMRpcServer(port: number = 8899, host?: string) {
  const server = new LiteSVMRpcServer();

  const bunServer = Bun.serve({
    port,
    hostname: host || process.env.RPC_HOST || "127.0.0.1",
    async fetch(req) {
      const DEBUG = process.env.DEBUG_RPC_LOG === "1";
      const acrh = req.headers.get("Access-Control-Request-Headers");
      const allowHeaders =
        acrh && acrh.length > 0
          ? acrh
          : "Content-Type, Accept, Origin, solana-client";
      const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS, HEAD",
        "Access-Control-Allow-Headers": allowHeaders,
        "Access-Control-Max-Age": "600",
        // Help Chrome when accessing local network/localhost from secure context
        "Access-Control-Allow-Private-Network": "true",
      } as const;

      if (req.method === "GET") {
        const url = new URL(req.url);
        if (url.pathname === "/" || url.pathname === "") {
          return new Response("ok", {
            headers: { "Content-Type": "text/plain", ...corsHeaders },
          });
        }
        if (url.pathname === "/health") {
          return new Response("ok", {
            headers: { "Content-Type": "text/plain", ...corsHeaders },
          });
        }
        return new Response("Not found", { status: 404, headers: corsHeaders });
      }
      if (req.method === "POST") {
        try {
          const body = await req.json();

          if (Array.isArray(body)) {
            if (DEBUG) {
              try {
                console.log(
                  "RPC batch:",
                  body.map((b: any) => b.method),
                );
              } catch {}
            }
            const responses = await Promise.all(
              body.map((request) => server.handleRequest(request)),
            );
            return new Response(JSON.stringify(responses), {
              headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          } else {
            const reqObj = body as JsonRpcRequest;
            if (DEBUG) {
              try {
                console.log(
                  "RPC:",
                  reqObj.method,
                  JSON.stringify(reqObj.params),
                );
              } catch {}
            }
            const response = await server.handleRequest(reqObj);
            return new Response(JSON.stringify(response), {
              headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          }
        } catch (error) {
          return new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              id: null,
              error: {
                code: -32700,
                message: "Parse error",
              },
            }),
            { headers: { "Content-Type": "application/json", ...corsHeaders } },
          );
        }
      }

      if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
      }
      if (req.method === "HEAD") {
        return new Response(null, { headers: corsHeaders });
      }

      return new Response("Method not allowed", {
        status: 405,
        headers: corsHeaders,
      });
    },
    error(error) {
      console.error("Server error:", error);
      return new Response("Internal Server Error", { status: 500 });
    },
  });

  const hostname = (host || process.env.RPC_HOST || "127.0.0.1").toString();
  console.log(`🚀 LiteSVM RPC Server running on http://${hostname}:${port}`);
  console.log(`   Compatible with Solana RPC API`);
  console.log(`   Use with: solana config set -u http://${hostname}:${port}`);

  return { httpServer: bunServer, rpcServer: server };
}
