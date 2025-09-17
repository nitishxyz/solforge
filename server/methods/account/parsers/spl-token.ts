import { PublicKey, type AccountInfo } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  unpackAccount,
  unpackMint,
  ExtensionType,
  getExtensionTypes,
  getExtensionData,
  getMetadataPointerState,
} from "@solana/spl-token";
import { unpack as unpackTokenMetadata } from "@solana/spl-token-metadata";
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
      const dec = unpackAccount(pubkey, toAccountInfo({ data, lamports: 0, owner: ownerPk, executable: false, rentEpoch: 0 }, ownerPk), programPk);
      // fetch mint decimals
      let decimals = 0;
      try {
        const mintAcc = context.svm.getAccount(dec.mint);
        if (mintAcc) {
          const mintOwner = typeof (mintAcc as any).owner?.toBase58 === "function"
            ? (mintAcc as any).owner as PublicKey
            : new PublicKey(mintAcc.owner);
          const mintProg = mintOwner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
          const mi = unpackMint(dec.mint, toAccountInfo(mintAcc, mintOwner), mintProg);
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
      const extensions = buildAccountExtensions(dec);
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
            closeAuthority: dec.closeAuthority ? dec.closeAuthority.toBase58() : null,
            extensions
          }
        },
        space
      };
    } catch {}
  }

  // Try mint
  try {
    const dec = unpackMint(pubkey, toAccountInfo({ data, lamports: 0, owner: ownerPk, executable: false, rentEpoch: 0 }, ownerPk), programPk);
    const supply = BigInt(dec.supply?.toString?.() ?? dec.supply ?? 0);
    const mintAuthority = dec.mintAuthority ? dec.mintAuthority.toBase58() : null;
    const freezeAuthority = dec.freezeAuthority ? dec.freezeAuthority.toBase58() : null;
    const extensions = buildMintExtensions(dec);
    return {
      program: programLabel,
      parsed: {
        type: "mint",
        info: {
          mintAuthority,
          supply: supply.toString(),
          decimals: dec.decimals,
          isInitialized: !!dec.isInitialized,
          freezeAuthority,
          extensions
        }
      },
      space
    };
  } catch {}

  // Fallback if not parsed
  return { program: programLabel, parsed: null, space };
}

function buildAccountExtensions(account: { tlvData: Buffer }): Array<{ type: string }> | undefined {
  if (!account.tlvData || account.tlvData.length === 0) return undefined;
  const types = getExtensionTypes(account.tlvData);
  if (!types.length) return undefined;
  return types.map((ext) => ({ type: ExtensionType[ext] ?? String(ext) }));
}

function buildMintExtensions(mint: { tlvData: Buffer }): Array<Record<string, any>> | undefined {
  if (!mint.tlvData || mint.tlvData.length === 0) return undefined;
  const types = getExtensionTypes(mint.tlvData);
  if (!types.length) return undefined;
  const out: Array<Record<string, any>> = [];
  for (const ext of types) {
    const entry: Record<string, any> = { type: ExtensionType[ext] ?? String(ext) };
    try {
      if (ext === ExtensionType.MetadataPointer) {
        const state = getMetadataPointerState(mint as any);
        if (state) {
          entry.info = {
            authority: state.authority ? state.authority.toBase58() : null,
            metadataAddress: state.metadataAddress ? state.metadataAddress.toBase58() : null,
          };
        }
      } else if (ext === ExtensionType.TokenMetadata) {
        const data = getExtensionData(ext, mint.tlvData);
        if (data) {
          const meta = unpackTokenMetadata(data);
          entry.info = {
            updateAuthority: meta.updateAuthority ? meta.updateAuthority.toBase58() : null,
            mint: meta.mint.toBase58(),
            name: meta.name,
            symbol: meta.symbol,
            uri: meta.uri,
            additionalMetadata: meta.additionalMetadata.map(([k, v]) => [k, v]),
          };
        }
      }
    } catch (error) {
      try { console.warn("[rpc] decode mint extension failed", error); } catch {}
    }
    out.push(entry);
  }
  return out.length ? out : undefined;
}

function toAccountInfo(raw: any, owner: PublicKey): AccountInfo<Buffer> {
  const data = raw.data instanceof Buffer ? raw.data : Buffer.from(raw.data ?? []);
  return {
    data,
    executable: !!raw.executable,
    lamports: Number(typeof raw.lamports === "bigint" ? raw.lamports : raw.lamports ?? 0),
    owner,
    rentEpoch: Number(raw.rentEpoch ?? 0),
  } as AccountInfo<Buffer>;
}
