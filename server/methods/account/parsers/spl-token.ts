import { PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, unpackAccount, unpackMint } from "@solana/spl-token";
import type { RpcMethodContext } from "../../../server/types";

export function parseSplTokenAccountOrMint(
  pubkey: PublicKey,
  ownerPk: PublicKey,
  data: Uint8Array,
  context: RpcMethodContext
) {
  const isTokenOwner = ownerPk.equals(TOKEN_PROGRAM_ID) || ownerPk.equals(TOKEN_2022_PROGRAM_ID);
  if (!isTokenOwner) return null;
  const programPk = ownerPk.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
  const programLabel = ownerPk.equals(TOKEN_2022_PROGRAM_ID) ? "spl-token-2022" : "spl-token";
  const space = data.length;

  // Try token account first
  if (space >= 165) {
    try {
      const dec = unpackAccount(pubkey, { data: Buffer.from(data), owner: ownerPk }, programPk);
      // fetch mint decimals
      let decimals = 0;
      try {
        const mintAcc = context.svm.getAccount(dec.mint);
        if (mintAcc) {
          const mintOwner = new PublicKey(mintAcc.owner);
          const mintProg = mintOwner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
          const mi = unpackMint(dec.mint, { data: Buffer.from(mintAcc.data), owner: mintOwner }, mintProg);
          decimals = mi?.decimals ?? 0;
        }
      } catch {}
      const amount = BigInt(dec.amount?.toString?.() ?? dec.amount ?? 0);
      const ui = Number.isFinite(decimals) ? Number(amount) / Math.pow(10, decimals) : null;
      const state = dec.isFrozen ? "frozen" : dec.isInitialized ? "initialized" : "uninitialized";
      const delegated = BigInt(dec.delegatedAmount?.toString?.() ?? dec.delegatedAmount ?? 0n);
      const delegatedUi = Number.isFinite(decimals) ? Number(delegated) / Math.pow(10, decimals) : null;
      const rentExemptReserve = dec.isNative
        ? { amount: BigInt(dec.rentExemptReserve?.toString?.() ?? dec.rentExemptReserve ?? 0).toString(), decimals: 9, uiAmount: null, uiAmountString: "0" }
        : null;
      return {
        program: programLabel,
        parsed: {
          type: "account",
          info: {
            mint: dec.mint.toBase58(),
            owner: dec.owner.toBase58(),
            tokenAmount: { amount: amount.toString(), decimals, uiAmount: ui, uiAmountString: (ui ?? 0).toString() },
            state,
            isNative: !!dec.isNative,
            delegatedAmount: { amount: delegated.toString(), decimals, uiAmount: delegatedUi, uiAmountString: (delegatedUi ?? 0).toString() },
            delegate: dec.delegate ? dec.delegate.toBase58() : null,
            rentExemptReserve,
            closeAuthority: dec.closeAuthority ? dec.closeAuthority.toBase58() : null
          }
        },
        space
      };
    } catch {}
  }

  // Try mint
  try {
    const dec = unpackMint(pubkey, { data: Buffer.from(data), owner: ownerPk }, programPk);
    const supply = BigInt(dec.supply?.toString?.() ?? dec.supply ?? 0);
    const mintAuthority = dec.mintAuthority ? dec.mintAuthority.toBase58() : null;
    const freezeAuthority = dec.freezeAuthority ? dec.freezeAuthority.toBase58() : null;
    return {
      program: programLabel,
      parsed: {
        type: "mint",
        info: {
          mintAuthority,
          supply: supply.toString(),
          decimals: dec.decimals,
          isInitialized: !!dec.isInitialized,
          freezeAuthority
        }
      },
      space
    };
  } catch {}

  // Fallback if not parsed
  return { program: programLabel, parsed: null, space };
}

