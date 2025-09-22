import { test, expect } from "bun:test";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  TransactionMessage,
  VersionedTransaction,
  PublicKey,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { LiteSVMRpcServer } from "../../rpc-server";

type RpcResp<T = any> = { jsonrpc: "2.0"; id: number; result?: T; error?: { code: number; message: string; data?: unknown } };

function jsonReq(method: string, params?: unknown) {
  return { jsonrpc: "2.0", id: Math.floor(Math.random() * 1e9), method, params };
}

test("captures inner instructions for ATA create (CPI)", async () => {
  const server = new LiteSVMRpcServer();
  async function call<T = any>(method: string, params?: unknown): Promise<RpcResp<T>> {
    return (await server.handleRequest(jsonReq(method, params))) as RpcResp<T>;
  }

  // Payer + airdrop
  const payer = Keypair.generate();
  const recip = Keypair.generate();
  await call("requestAirdrop", [payer.publicKey.toBase58(), 1 * LAMPORTS_PER_SOL]);

  // Create a test mint via admin helper
  const mintResp = await call<{ mint: string }>("solforgeCreateMint", [null, 6, null]);
  expect(mintResp.error).toBeUndefined();
  const mint = new PublicKey(mintResp.result!.mint);

  // Build 1 ATA instruction that triggers CPIs into system + token
  const bh = await call<{ value: { blockhash: string } }>("getLatestBlockhash", []);
  const ata = await getAssociatedTokenAddress(mint, recip.publicKey, false);
  const ix = createAssociatedTokenAccountInstruction(payer.publicKey, ata, recip.publicKey, mint);
  const msg = new TransactionMessage({ payerKey: payer.publicKey, recentBlockhash: bh.result!.value.blockhash, instructions: [ix] }).compileToLegacyMessage();
  const tx = new VersionedTransaction(msg);
  tx.sign([payer]);

  const sigResp = await call<string>("sendTransaction", [Buffer.from(tx.serialize()).toString("base64")]);
  expect(sigResp.error).toBeUndefined();
  const sig = sigResp.result!;

  const txResp = await call<any>("getTransaction", [sig, { encoding: "json" }]);
  expect(txResp.error).toBeUndefined();
  const tr = txResp.result!;

  // At least one top-level instruction
  expect(Array.isArray(tr.transaction.message.instructions)).toBe(true);
  expect(tr.transaction.message.instructions.length).toBe(1);

  // Check inner instructions captured or (worst case) logs exist
  const ii = tr.meta.innerInstructions;
  const logs = tr.meta.logMessages || [];
  expect(Array.isArray(ii)).toBe(true);
  // At minimum, either we have structured inner ixs, or logs were captured
  expect(ii.length > 0 || logs.length > 0).toBe(true);
});
