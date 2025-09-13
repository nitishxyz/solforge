import { PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import type { RpcMethodHandler } from "../../types";

/**
 * Implements the requestAirdrop RPC method
 * @see https://docs.solana.com/api/http#requestairdrop
 */
export const requestAirdrop: RpcMethodHandler = (id, params, context) => {
  const [pubkeyStr, lamports] = params;
  
  try {
    const toPubkey = new PublicKey(pubkeyStr);
    const faucet = context.getFaucet();
    // Use a fresh pseudo-blockhash to avoid duplicate signatures on repeated airdrops
    const bh = new Uint8Array(32);
    crypto.getRandomValues(bh);
    const recentBlockhash = context.encodeBase58(bh);

    // Ensure faucet has enough balance; top up via svm.airdrop if needed
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const current = (context.svm as any).getBalance?.(faucet.publicKey) ?? 0n;
      const needed = BigInt(lamports) + 10_000n; // cover fee
      if (current < needed) {
        const delta = needed - BigInt(current);
        (context.svm as any).airdrop?.(faucet.publicKey, delta);
      }
    } catch {}

    const ix = SystemProgram.transfer({
      fromPubkey: faucet.publicKey,
      toPubkey,
      lamports: Number(BigInt(lamports))
    });

    const msg = new TransactionMessage({
      payerKey: faucet.publicKey,
      recentBlockhash,
      instructions: [ix]
    }).compileToV0Message();

    const tx = new VersionedTransaction(msg);
    tx.sign([faucet]);

    const sendResult = context.svm.sendTransaction(tx);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const maybeErr = (sendResult as any).err?.() ?? (sendResult as any).err;
      if (maybeErr) {
        return context.createErrorResponse(id, -32003, "Airdrop failed", maybeErr);
      }
    } catch {}

    const signature = tx.signatures[0] ? context.encodeBase58(tx.signatures[0]) : context.encodeBase58(new Uint8Array(64).fill(0));
    context.notifySignature(signature);

    return context.createSuccessResponse(id, signature);
  } catch (error: any) {
    return context.createErrorResponse(id, -32602, "Invalid params", error.message);
  }
};
