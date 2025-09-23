import { test, expect } from "bun:test";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
// eslint-disable-next-line import/default
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  getAccount as getSplAccount,
  MintLayout,
  MINT_SIZE,
} from "@solana/spl-token";

import IDL from "./soljar.json" with { type: "json" };
import type { Soljar } from "./soljar";

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

function rpcUrl() {
  return process.env.SOLFORGE_RPC_URL ?? "http://127.0.0.1:8899";
}

function derivePdas(owner: PublicKey, programId: PublicKey) {
  const accountV2 = PublicKey.findProgramAddressSync(
    [Buffer.from("account_v2"), owner.toBuffer()],
    programId,
  )[0];
  const vaultV2 = PublicKey.findProgramAddressSync(
    [Buffer.from("vault_v2"), accountV2.toBuffer()],
    programId,
  )[0];
  return { accountV2, vaultV2 };
}

test("executeTransaction sends USDC from vault A to vault B (smart-to-smart)", async () => {
  const connection = new Connection(rpcUrl(), "confirmed");

  // Owners for two smart wallets
  const ownerA = Keypair.generate();
  const ownerB = Keypair.generate();

  // Fund both owners for fees
  {
    const a1 = await connection.requestAirdrop(ownerA.publicKey, 2 * LAMPORTS_PER_SOL);
    const a2 = await connection.requestAirdrop(ownerB.publicKey, 2 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(a1, "confirmed");
    await connection.confirmTransaction(a2, "confirmed");
  }

  // Anchor program
  const providerA = new AnchorProvider(connection, new NodeWallet(ownerA), {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  const program = new Program<Soljar>(IDL as unknown as Soljar, providerA);

  // Setup smart wallets for both owners
  const routeA = `s2s_a_${Date.now().toString(36).slice(-4)}`;
  await program.methods
    .setupAccountV2(routeA, null)
    .accounts({ owner: ownerA.publicKey, paymaster: ownerA.publicKey, usdcMint: USDC_MINT })
    .signers([ownerA])
    .rpc();

  const providerB = new AnchorProvider(connection, new NodeWallet(ownerB), {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  const programB = new Program<Soljar>(IDL as unknown as Soljar, providerB);
  const routeB = `s2s_b_${Date.now().toString(36).slice(-4)}`;
  await programB.methods
    .setupAccountV2(routeB, null)
    .accounts({ owner: ownerB.publicKey, paymaster: ownerB.publicKey, usdcMint: USDC_MINT })
    .signers([ownerB])
    .rpc();

  const { accountV2: accountA, vaultV2: vaultA } = derivePdas(ownerA.publicKey, program.programId);
  const { accountV2: accountB, vaultV2: vaultB } = derivePdas(ownerB.publicKey, program.programId);

  // Mint to sender vault
  const mintAmount = 1_000_000n; // 1 USDC
  const rpcRes = await fetch(rpcUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "mint_to_vault_a",
      method: "solforgeMintTo",
      params: [USDC_MINT.toBase58(), vaultA.toBase58(), mintAmount.toString()],
    }),
  });
  const rpcJson = (await rpcRes.json()) as { result?: unknown; error?: unknown };
  expect(rpcJson.error, "mintTo should succeed").toBeUndefined();

  const fromTokenAccount = getAssociatedTokenAddressSync(USDC_MINT, vaultA, true);
  const toTokenAccount = getAssociatedTokenAddressSync(USDC_MINT, vaultB, true);

  // Read decimals from mint
  const mintInfo = await connection.getAccountInfo(USDC_MINT, "confirmed");
  if (!mintInfo) throw new Error("USDC mint not found on SolForge");
  const decodedMint = MintLayout.decode(mintInfo.data.slice(0, MINT_SIZE));
  const decimals = decodedMint.decimals;

  const beforeFrom = (await getSplAccount(connection, fromTokenAccount, "confirmed")).amount;
  const toInfo = await connection.getAccountInfo(toTokenAccount, "confirmed");
  const beforeTo = toInfo ? (await getSplAccount(connection, toTokenAccount, "confirmed")).amount : 0n;

  // Build instructions and remainingAccounts following soljar app pattern
  const remainingAccounts: Array<{ publicKey: PublicKey; isWritable: boolean; isSigner: boolean }> = [];
  const findOrAdd = (pk: PublicKey, w: boolean, s: boolean) => {
    const i = remainingAccounts.findIndex((a) => a.publicKey.equals(pk));
    if (i !== -1) {
      if (w) remainingAccounts[i]!.isWritable = true;
      if (s) remainingAccounts[i]!.isSigner = true;
      return i;
    }
    remainingAccounts.push({ publicKey: pk, isWritable: w, isSigner: s });
    return remainingAccounts.length - 1;
  };

  const payerIdx = findOrAdd(ownerA.publicKey, true, true);
  const systemIdx = findOrAdd(SystemProgram.programId, false, false);
  const tokenIdx = findOrAdd(TOKEN_PROGRAM_ID, false, false);
  const ataProgIdx = findOrAdd(ASSOCIATED_TOKEN_PROGRAM_ID, false, false);
  const mintIdx = findOrAdd(USDC_MINT, false, false);
  const fromAtaIdx = findOrAdd(fromTokenAccount, true, false);
  const toAtaIdx = findOrAdd(toTokenAccount, true, false);
  const ownerBIdx = findOrAdd(vaultB, false, false); // recipient owner is vaultB (PDA)
  const vaultAIdx = findOrAdd(vaultA, false, false);

  const instructions: Array<{ programId: PublicKey; data: Buffer; accountIndices: Buffer; accountWriteFlags: boolean[] }>= [];

  if (!toInfo) {
    const createIx = createAssociatedTokenAccountInstruction(
      ownerA.publicKey, // payer
      toTokenAccount,
      vaultB,          // owner is vaultB (PDA)
      USDC_MINT,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    instructions.push({
      programId: ASSOCIATED_TOKEN_PROGRAM_ID,
      data: Buffer.from(createIx.data),
      accountIndices: Buffer.from([
        payerIdx,
        toAtaIdx,
        ownerBIdx,
        mintIdx,
        systemIdx,
        tokenIdx,
        ataProgIdx,
      ]),
      accountWriteFlags: [true, true, false, false, false, false, false],
    });
  }

  const sendAmount = 105_000n; // 0.105 USDC
  const transferIx = createTransferCheckedInstruction(
    fromTokenAccount,
    USDC_MINT,
    toTokenAccount,
    vaultA,
    Number(sendAmount),
    decimals,
  );
  instructions.push({
    programId: TOKEN_PROGRAM_ID,
    data: Buffer.from(transferIx.data),
    accountIndices: Buffer.from([fromAtaIdx, mintIdx, toAtaIdx, vaultAIdx]),
    accountWriteFlags: [true, false, true, false],
  });

  await program.methods
    .executeTransaction(instructions as any)
    .accounts({ account: accountA, vault: vaultA, owner: ownerA.publicKey })
    .remainingAccounts(remainingAccounts.map((a) => ({ pubkey: a.publicKey, isWritable: a.isWritable, isSigner: a.isSigner })))
    .signers([ownerA])
    .rpc();

  const afterFrom = (await getSplAccount(connection, fromTokenAccount, "confirmed")).amount;
  const afterTo = (await getSplAccount(connection, toTokenAccount, "confirmed")).amount;

  expect(afterTo - beforeTo).toBe(sendAmount);
  expect(beforeFrom - afterFrom).toBe(sendAmount);
});

