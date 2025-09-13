import { PublicKey } from "@solana/web3.js";
import type { RpcMethodHandler } from "../../types";

export const getProgramAccounts: RpcMethodHandler = async (id, params, context) => {
  const [programId, config] = params || [];
  try {
    const programPubkey = new PublicKey(programId);
    const limit = Math.max(1, Math.min(Number(config?.limit ?? 1000), 1000));
    // Query indexed addresses by owner program
    let rows: Array<{ address: string }> = [];
    try {
      rows = (await context.store?.getAccountsByOwner(programPubkey.toBase58(), limit)) || [];
    } catch {
      rows = [];
    }

    // Fetch current account data from LiteSVM for each address
    const results: any[] = [];
    for (const r of rows) {
      try {
        const pk = new PublicKey(r.address);
        const acc = context.svm.getAccount(pk);
        if (!acc) continue;
        const owner = new PublicKey(acc.owner).toBase58();
        results.push({
          pubkey: r.address,
          account: {
            lamports: Number(acc.lamports || 0n),
            owner,
            data: [Buffer.from(acc.data).toString("base64"), "base64"] as const,
            executable: !!acc.executable,
            rentEpoch: Number(acc.rentEpoch || 0)
          }
        });
      } catch {}
    }

    return context.createSuccessResponse(id, results);
  } catch (error: any) {
    return context.createErrorResponse(id, -32602, "Invalid params", error.message);
  }
};
