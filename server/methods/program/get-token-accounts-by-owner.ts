import type { RpcMethodHandler } from "../../types";
import { PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, unpackAccount, unpackMint } from "@solana/spl-token";

export const getTokenAccountsByOwner: RpcMethodHandler = async (id, params, context) => {
  try {
    const [ownerStr, filter, config] = params || [];
    const owner = new PublicKey(ownerStr);
    const wantMint: string | null = filter?.mint ? String(filter.mint) : null;
    const requestedProgramId: string | null = filter?.programId ? String(filter.programId) : null;
    const encoding: string = config?.encoding || "jsonParsed";
    const classicId = TOKEN_PROGRAM_ID.toBase58();
    const token2022Id = TOKEN_2022_PROGRAM_ID.toBase58();
    const programFilter = requestedProgramId === token2022Id
      ? token2022Id
      : classicId;

    // Query DB for accounts owned by SPL Token program
    const rows = (await context.store?.getAccountsByOwner(programFilter, 50_000)) || [];
    const out: any[] = [];
    const seen = new Set<string>();
    for (const r of rows) {
      if (seen.has(r.address)) continue;
      try {
        const pk = new PublicKey(r.address);
        const acc = context.svm.getAccount(pk);
        if (!acc) continue;
        if ((acc.data?.length ?? 0) < 165) continue;
        const ownerPk = new PublicKey(acc.owner);
        const programPk = requestedProgramId === token2022Id ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
        const dec = unpackAccount(pk, { data: Buffer.from(acc.data), owner: ownerPk }, programPk);
        const decMint = dec.mint.toBase58();
        const decOwner = dec.owner.toBase58();
        if (decOwner !== owner.toBase58()) continue;
        if (wantMint && decMint !== wantMint) continue;
        if (encoding === "jsonParsed") {
          let decimals = 0;
          try {
            const mintAcc = context.svm.getAccount(dec.mint);
            const info = mintAcc ? unpackMint(dec.mint, { data: Buffer.from(mintAcc.data), owner: new PublicKey(mintAcc.owner) }, programPk) : null;
            decimals = info?.decimals ?? 0;
          } catch {}
          const amount = BigInt(dec.amount?.toString?.() ?? dec.amount ?? 0);
          const ui = decimals >= 0 ? Number(amount) / Math.pow(10, decimals) : null;
          const state = dec.isFrozen ? "frozen" : dec.isInitialized ? "initialized" : "uninitialized";
          const amountUi = { amount: amount.toString(), decimals, uiAmount: ui, uiAmountString: (ui ?? 0).toString() };
          // delegatedAmount as UiTokenAmount per RPC schema
          const delegated = BigInt(dec.delegatedAmount?.toString?.() ?? dec.delegatedAmount ?? 0n);
          const delegatedUiAmount = decimals >= 0 ? Number(delegated) / Math.pow(10, decimals) : null;
          const delegatedAmount = {
            amount: delegated.toString(),
            decimals,
            uiAmount: delegatedUiAmount,
            uiAmountString: (delegatedUiAmount ?? 0).toString()
          };
          // rentExemptReserve only for native (wrapped SOL) accounts; value in lamports (9 decimals)
          let rentExemptReserve = null as any;
          if (dec.isNative) {
            const lamports = BigInt(dec.rentExemptReserve?.toString?.() ?? dec.rentExemptReserve ?? 0n);
            const lamportsUi = Number(lamports) / 1_000_000_000;
            rentExemptReserve = {
              amount: lamports.toString(),
              decimals: 9,
              uiAmount: lamportsUi,
              uiAmountString: lamportsUi.toString()
            };
          }
          out.push({
            pubkey: r.address,
            account: {
              lamports: Number(acc.lamports || 0n),
              owner: TOKEN_PROGRAM_ID.toBase58(),
              executable: !!acc.executable,
              rentEpoch: Number(acc.rentEpoch || 0),
              data: {
                program: programFilter === token2022Id ? "spl-token-2022" : "spl-token",
                parsed: {
                  type: "account",
                  info: {
                    mint: decMint,
                    owner: decOwner,
                    tokenAmount: amountUi,
                    state,
                    isNative: !!dec.isNative,
                    delegatedAmount: delegatedAmount,
                    delegate: dec.delegate ? dec.delegate.toBase58() : null,
                    rentExemptReserve,
                    closeAuthority: dec.closeAuthority ? dec.closeAuthority.toBase58() : null
                  }
                },
                space: acc.data?.length ?? 0
              }
            }
          });
          seen.add(r.address);
        } else {
          out.push({
            pubkey: r.address,
            account: {
              lamports: Number(acc.lamports || 0n),
              owner: TOKEN_PROGRAM_ID.toBase58(),
              executable: !!acc.executable,
              rentEpoch: Number(acc.rentEpoch || 0),
              data: [Buffer.from(acc.data).toString("base64"), "base64"] as const
            }
          });
          seen.add(r.address);
        }
      } catch {}
    }
    return context.createSuccessResponse(id, { context: { slot: Number(context.slot) }, value: out });
  } catch (e: any) {
    return context.createErrorResponse(id, -32602, "Invalid params", e.message);
  }
};
