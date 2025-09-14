import { PublicKey } from "@solana/web3.js";
import type { RpcMethodContext } from "../../../server/types";

const LOADER_UPGRADEABLE = "BPFLoaderUpgradeab1e11111111111111111111111";

export function parseUpgradeableLoader(owner: string, data: Uint8Array, context: RpcMethodContext) {
  if (owner !== LOADER_UPGRADEABLE) return null;
  const bytes = data;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const space = bytes.length;
  let parsed: any = null;
  try {
    if (bytes.length >= 4) {
      const tag = dv.getUint32(0, true);
      if (tag === 2 && bytes.length >= 36) {
        // Program: [u32 tag][32 programDataPubkey]
        const pd = new PublicKey(bytes.slice(4, 36)).toBase58();
        parsed = { type: "program", info: { programData: pd } };
      } else if (tag === 3 && bytes.length >= 4 + 8 + 1) {
        // ProgramData: [u32 tag][u64 slot][Option<Pubkey> upgradeAuthority]
        const slot = Number(dv.getBigUint64(4, true));
        let upgradeAuthority: string | null = null;
        let opt = dv.getUint8(12);
        if (opt === 1 && bytes.length >= 13 + 32) {
          upgradeAuthority = new PublicKey(bytes.slice(13, 45)).toBase58();
        } else if (opt !== 0 && bytes.length >= 12 + 4 + 32) {
          // Fallback u32 option
          const opt32 = dv.getUint32(12, true);
          if (opt32 === 1) upgradeAuthority = new PublicKey(bytes.slice(16, 48)).toBase58();
        }
        parsed = { type: "programData", info: { slot: slot === 0 ? Number(context.slot) : slot, upgradeAuthority, authority: upgradeAuthority } };
      } else if (tag === 1) {
        // Buffer: [u32 tag][Option<Pubkey> authority]
        let authority: string | null = null;
        if (bytes.length >= 5) {
          const hasAuth = dv.getUint8(4);
          if (hasAuth === 1 && bytes.length >= 5 + 32) authority = new PublicKey(bytes.slice(5, 37)).toBase58();
        }
        parsed = { type: "buffer", info: { authority } };
      }
    }
  } catch {}
  return { program: "bpf-upgradeable-loader", parsed, space };
}

