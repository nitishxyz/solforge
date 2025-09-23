import type { PublicKey, TransactionInstruction } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  decodeInstruction as splDecodeInstruction,
  decodeMintToCheckedInstruction,
  decodeTransferInstruction,
  decodeTransferCheckedInstruction,
  decodeInitializeAccount3Instruction,
  decodeInitializeImmutableOwnerInstruction,
} from "@solana/spl-token";
import { u8 } from "@solana/buffer-layout";

// Keep shape compatible with instruction-parser
export type ParsedInstruction =
  | { program: string; programId: string; parsed: { type: string; info: any } }
  | { programId: string; accounts: string[]; data: string };

function ok(programId: string, type: string, info: any): ParsedInstruction {
  return { program: "spl-token", programId, parsed: { type, info } };
}

function asBase58(pk: PublicKey | undefined): string | undefined {
  try {
    return pk ? pk.toBase58() : undefined;
  } catch {
    return undefined;
  }
}

export function tryParseSplToken(
  ix: TransactionInstruction,
  programIdStr: string,
  accountKeys: string[],
  dataBase58: string,
): ParsedInstruction | null {
  try {
    if (!ix.programId.equals(TOKEN_PROGRAM_ID)) return null;

    // Fast path via provided decoder for common instructions
    try {
      const d = splDecodeInstruction(ix);
      // MintToChecked
      try {
        const m = decodeMintToCheckedInstruction(ix);
        const amount = m.data.amount;
        const decimals = m.data.decimals;
        const amtStr = typeof amount === "bigint" ? amount.toString() : String(amount);
        const base = BigInt(10) ** BigInt(decimals);
        const whole = BigInt(amtStr) / base;
        const frac = BigInt(amtStr) % base;
        const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
        const uiStr = fracStr.length ? `${whole}.${fracStr}` : `${whole}`;
        return ok(programIdStr, "mintToChecked", {
          account: asBase58(m.keys.destination.pubkey),
          mint: asBase58(m.keys.mint.pubkey),
          mintAuthority: asBase58(m.keys.authority.pubkey),
          tokenAmount: {
            amount: amtStr,
            decimals,
            uiAmount: Number(uiStr),
            uiAmountString: uiStr,
          },
        });
      } catch {}

      // Transfer / TransferChecked
      try {
        const t = decodeTransferInstruction(ix);
        const amt = t.data.amount;
        return ok(programIdStr, "transfer", {
          amount: (typeof amt === "bigint" ? amt.toString() : String(amt)),
          source: asBase58(t.keys.source.pubkey),
          destination: asBase58(t.keys.destination.pubkey),
          authority: asBase58(t.keys.owner.pubkey),
        });
      } catch {}

      try {
        const t = decodeTransferCheckedInstruction(ix);
        const amt = t.data.amount;
        const decimals = t.data.decimals;
        return ok(programIdStr, "transferChecked", {
          tokenAmount: {
            amount: (typeof amt === "bigint" ? amt.toString() : String(amt)),
            decimals,
          },
          source: asBase58(t.keys.source.pubkey),
          destination: asBase58(t.keys.destination.pubkey),
          authority: asBase58(t.keys.owner.pubkey),
          mint: asBase58(t.keys.mint.pubkey),
        });
      } catch {}

      // InitializeAccount3
      try {
        const a = decodeInitializeAccount3Instruction(ix);
        return ok(programIdStr, "initializeAccount3", {
          account: asBase58(a.keys.account.pubkey),
          mint: asBase58(a.keys.mint.pubkey),
          owner: asBase58(a.data.owner),
        });
      } catch {}

      // InitializeImmutableOwner
      try {
        const im = decodeInitializeImmutableOwnerInstruction(ix);
        return ok(programIdStr, "initializeImmutableOwner", {
          account: asBase58(im.keys.account.pubkey),
        });
      } catch {}
    } catch {}

    // GetAccountDataSize: decode extension types (u16 little-endian sequence)
    try {
      const bytes = Buffer.from(bs58decode(dataBase58));
      const t = u8().decode(bytes);
      // 21 corresponds to TokenInstruction.GetAccountDataSize
      if (t === 21) {
        const mint = asBase58(ix.keys[0]?.pubkey);
        const extCodes: number[] = [];
        for (let i = 1; i + 1 < bytes.length; i += 2) {
          const code = bytes[i] | (bytes[i + 1] << 8);
          extCodes.push(code);
        }
        const extMap: Record<number, string> = {
          7: "immutableOwner",
          8: "memoTransfer",
          9: "nonTransferable",
          12: "permanentDelegate",
          14: "transferHook",
          15: "transferHookAccount",
          18: "metadataPointer",
          19: "tokenMetadata",
          20: "groupPointer",
          21: "tokenGroup",
          22: "groupMemberPointer",
          23: "tokenGroupMember",
          25: "scaledUiAmountConfig",
          26: "pausableConfig",
          27: "pausableAccount",
        };
        const extensionTypes = extCodes.map((c) => extMap[c] || String(c));
        return ok(programIdStr, "getAccountDataSize", { mint, extensionTypes });
      }
    } catch {}

    // Unknown SPL token instruction
    return null;
  } catch {
    return null;
  }
}

// Local base58 decode to avoid importing from sibling file
const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const BASE = BigInt(ALPHABET.length);
function bs58decode(str: string): Uint8Array {
  let num = 0n;
  for (const char of str) {
    const index = ALPHABET.indexOf(char);
    if (index === -1) throw new Error("Invalid base58 character");
    num = num * BASE + BigInt(index);
  }
  const bytes: number[] = [];
  while (num > 0n) {
    bytes.unshift(Number(num % 256n));
    num = num / 256n;
  }
  for (let i = 0; i < str.length && str[i] === "1"; i++) bytes.unshift(0);
  return new Uint8Array(bytes.length > 0 ? bytes : [0]);
}
