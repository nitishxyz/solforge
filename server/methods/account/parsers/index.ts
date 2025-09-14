import { PublicKey } from "@solana/web3.js";
import type { RpcMethodContext } from "../../../server/types";
import { parseSystemAccount } from "./system";
import { parseSplTokenAccountOrMint } from "./spl-token";
import { parseUpgradeableLoader } from "./loader-upgradeable";

export type ParsedAccountData = {
  program: string;
  parsed: any; // match Solana RPC jsonParsed payloads
  space: number;
} | null;

export function parseAccountJson(
  pubkey: PublicKey,
  account: { owner: PublicKey | string; data: Uint8Array | Buffer | number[]; lamports: bigint | number; executable?: boolean; rentEpoch?: bigint | number },
  context: RpcMethodContext
): ParsedAccountData {
  const ownerStr = typeof account.owner === "string" ? account.owner : new PublicKey(account.owner).toBase58();
  const ownerPk = typeof account.owner === "string" ? new PublicKey(account.owner) : (account.owner as PublicKey);
  const dataBytes = account.data instanceof Uint8Array ? account.data : Buffer.from(account.data as any);
  const space = dataBytes.length;

  // 1) System program
  const sys = parseSystemAccount(ownerStr, space);
  if (sys) return sys;

  // 2) SPL Token (v1) & Token-2022
  const token = parseSplTokenAccountOrMint(pubkey, ownerPk, dataBytes, context);
  if (token) return token;

  // 3) BPF Upgradeable Loader
  const loader = parseUpgradeableLoader(ownerStr, dataBytes, context);
  if (loader) return loader;

  // 4) Unknown
  return { program: "unknown", parsed: null, space };
}

