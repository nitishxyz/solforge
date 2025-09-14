import { PublicKey } from "@solana/web3.js";

export const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

// Minimal SPL Token v1 layouts
export type DecodedMint = {
  supply: bigint;
  decimals: number;
  isInitialized: boolean;
};

export type DecodedTokenAccount = {
  mint: string;
  owner: string;
  amount: bigint;
  state: number;
  delegatedAmount: bigint;
};

export function decodeMint(data: Uint8Array): DecodedMint | null {
  if (!data || data.length < 82) return null;
  const view = new DataView(
    data.buffer,
    data.byteOffset,
    data.byteLength
  );
  // supply at offset 36? Common layout: 4 (opt) + 32 (auth) + 8 (supply) + 1 (dec) + 1 (init)
  const supply = view.getBigUint64(36, true);
  const decimals = view.getUint8(44);
  const isInitialized = view.getUint8(45) !== 0;
  return { supply, decimals, isInitialized };
}

export function decodeTokenAccount(data: Uint8Array): DecodedTokenAccount | null {
  if (!data || data.length < 165) return null;
  const mint = new PublicKey(data.slice(0, 32)).toBase58();
  const owner = new PublicKey(data.slice(32, 64)).toBase58();
  const view = new DataView(
    data.buffer,
    data.byteOffset,
    data.byteLength
  );
  const amount = view.getBigUint64(64, true);
  const state = data[108];
  const delegatedAmount = view.getBigUint64(124, true);
  return { mint, owner, amount, state, delegatedAmount };
}

export function formatUiAmount(amount: bigint, decimals: number) {
  const base = BigInt(10) ** BigInt(decimals);
  const whole = amount / base;
  const frac = amount % base;
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  const ui = fracStr.length > 0 ? `${whole}.${fracStr}` : `${whole}`;
  return {
    amount: amount.toString(),
    decimals,
    uiAmount: Number(ui),
    uiAmountString: ui
  };
}

