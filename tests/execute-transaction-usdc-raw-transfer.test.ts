import { test, expect } from "bun:test";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
// eslint-disable-next-line import/default
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
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

test("executeTransaction sends USDC via raw Transfer (unchecked)", async () => {
  const connection = new Connection(rpcUrl(), "confirmed");

  const payer = Keypair.generate();
  const airdropSig = await connection.requestAirdrop(
    payer.publicKey,
    2 * LAMPORTS_PER_SOL,
  );
  await connection.confirmTransaction(airdropSig, "confirmed");

  const provider = new AnchorProvider(connection, new NodeWallet(payer), {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  const program = new Program<Soljar>(IDL as unknown as Soljar, provider);

  // Initialize smart wallet
  const routeId = `usdc_raw_${Date.now().toString(36).slice(-6)}`;
  await program.methods
    .setupAccountV2(routeId, null)
    .accounts({ owner: payer.publicKey, paymaster: payer.publicKey, usdcMint: USDC_MINT })
    .signers([payer])
    .rpc();

  const { accountV2, vaultV2 } = derivePdas(payer.publicKey, program.programId);

  // Mint some USDC to vault
  const mintAmount = 2_000_000n; // 2 USDC
  const rpcRes = await fetch(rpcUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "mint_to_vault_raw", method: "solforgeMintTo", params: [USDC_MINT.toBase58(), vaultV2.toBase58(), mintAmount.toString()] }),
  });
  const rpcJson = (await rpcRes.json()) as { result?: unknown; error?: unknown };
  expect(rpcJson.error, "mintTo should succeed").toBeUndefined();

  const fromTokenAccount = getAssociatedTokenAddressSync(USDC_MINT, vaultV2, true);
  const recipient = Keypair.generate().publicKey;
  const toTokenAccount = getAssociatedTokenAddressSync(USDC_MINT, recipient, true);

  // Ensure recipient ATA exists (create via separate transaction if needed)
  let toInfo = await connection.getAccountInfo(toTokenAccount, "confirmed");
  if (!toInfo) {
    const createIx = createAssociatedTokenAccountInstruction(
      payer.publicKey,
      toTokenAccount,
      recipient,
      USDC_MINT,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    const tx = new Transaction().add(createIx);
    tx.feePayer = payer.publicKey;
    const { blockhash } = await connection.getLatestBlockhash("confirmed");
    tx.recentBlockhash = blockhash;
    tx.sign(payer);
    const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: true });
    const bh2 = await connection.getLatestBlockhash("confirmed");
    await connection.confirmTransaction({ signature: sig, blockhash: bh2.blockhash, lastValidBlockHeight: bh2.lastValidBlockHeight }, "confirmed");
    toInfo = await connection.getAccountInfo(toTokenAccount, "confirmed");
    expect(!!toInfo, "recipient ATA should exist after creation").toBe(true);
  }

  const remainingAccounts: Array<{ publicKey: PublicKey; isWritable: boolean; isSigner: boolean }> = [];
  const upsert = (pk: PublicKey, w: boolean, s: boolean) => {
    const i = remainingAccounts.findIndex((a) => a.publicKey.equals(pk));
    if (i !== -1) {
      if (w) remainingAccounts[i]!.isWritable = true;
      if (s) remainingAccounts[i]!.isSigner = true;
      return i;
    }
    remainingAccounts.push({ publicKey: pk, isWritable: w, isSigner: s });
    return remainingAccounts.length - 1;
  };

  const payerIdx = upsert(payer.publicKey, true, true);
  const systemIdx = upsert(SystemProgram.programId, false, false);
  const tokenIdx = upsert(TOKEN_PROGRAM_ID, false, false);
  const ataProgIdx = upsert(ASSOCIATED_TOKEN_PROGRAM_ID, false, false);
  const mintIdx = upsert(USDC_MINT, false, false);
  const fromAtaIdx = upsert(fromTokenAccount, true, false);
  const toAtaIdx = upsert(toTokenAccount, true, false);
  const ownerIdx = upsert(recipient, false, false);
  const vaultIdx = upsert(vaultV2, false, false);

  const instructions: Array<{ programId: PublicKey; data: Buffer; accountIndices: Buffer; accountWriteFlags: boolean[] }> = [];

  // No need to add ATA creation inside smart wallet flow

  // Build unchecked transfer (no decimals included)
  const sendAmount = 150_000n; // 0.15 USDC in base units
  const transferIx = createTransferInstruction(
    fromTokenAccount,
    toTokenAccount,
    vaultV2,
    Number(sendAmount),
  );
  // Keys for unchecked transfer: [source, destination, owner]
  instructions.push({
    programId: TOKEN_PROGRAM_ID,
    data: Buffer.from(transferIx.data),
    accountIndices: Buffer.from([fromAtaIdx, toAtaIdx, vaultIdx]),
    accountWriteFlags: [true, true, false],
  });

  // Capture pre balances
  const beforeFrom = (await getSplAccount(connection, fromTokenAccount, "confirmed")).amount;
  const beforeTo = (await getSplAccount(connection, toTokenAccount, "confirmed")).amount;

  await program.methods
    .executeTransaction(instructions as any)
    .accounts({ account: accountV2, vault: vaultV2, owner: payer.publicKey })
    .remainingAccounts(remainingAccounts.map((a) => ({ pubkey: a.publicKey, isWritable: a.isWritable, isSigner: a.isSigner })))
    .signers([payer])
    .rpc();

  // Verify balances changed
  const afterFrom = (await getSplAccount(connection, fromTokenAccount, "confirmed")).amount;
  const afterTo = (await getSplAccount(connection, toTokenAccount, "confirmed")).amount;

  expect(beforeFrom >= sendAmount).toBe(true);
  expect(afterTo - beforeTo).toBe(sendAmount);
  expect(beforeFrom - afterFrom).toBe(sendAmount);
});
