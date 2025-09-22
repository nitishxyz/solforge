import { test, expect } from "bun:test";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
// Node wallet for Anchor provider (non-browser env)
// eslint-disable-next-line import/default
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { getAssociatedTokenAddressSync, getAccount as getSplAccount } from "@solana/spl-token";

// IDL + types
import IDL from "./soljar.json" with { type: "json" };
import type { Soljar } from "./soljar";

// USDC mint cloned into SolForge
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

function rpcUrl() {
  return process.env.SOLFORGE_RPC_URL ?? "http://127.0.0.1:8899";
}

function derivePdas(owner: PublicKey, programId: PublicKey, routeId: string) {
  const accountV2 = PublicKey.findProgramAddressSync(
    [Buffer.from("account_v2"), owner.toBuffer()],
    programId,
  )[0];

  const routeV2 = PublicKey.findProgramAddressSync(
    [Buffer.from("route_v2"), accountV2.toBuffer(), Buffer.from([0])],
    programId,
  )[0];

  const routeByIdV2 = PublicKey.findProgramAddressSync(
    [Buffer.from("route_by_id_v2"), Buffer.from(routeId)],
    programId,
  )[0];

  const vaultV2 = PublicKey.findProgramAddressSync(
    [Buffer.from("vault_v2"), accountV2.toBuffer()],
    programId,
  )[0];

  return { accountV2, routeV2, routeByIdV2, vaultV2 };
}

test("setupAccountV2 creates account, route, and vault ATA on SolForge", async () => {
  // Connect to SolForge RPC
  const connection = new Connection(rpcUrl(), "confirmed");

  // Create a fresh payer
  const payer = Keypair.generate();
  const airdropSig = await connection.requestAirdrop(payer.publicKey, 2 * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(airdropSig, "confirmed");

  // Anchor provider + program from local IDL/types
  const provider = new AnchorProvider(connection, new NodeWallet(payer), {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });

  const program = new Program<Soljar>(IDL as unknown as Soljar, provider);

  // Use a unique jar id each run to avoid collisions
  const jarId = `solforge_v2_${Date.now().toString(36).slice(-6)}`;

  // Invoke setupAccountV2 (Anchor will derive PDAs from IDL)
  await program.methods
    .setupAccountV2(jarId, null)
    .accounts({
      owner: payer.publicKey,
      paymaster: payer.publicKey,
      usdcMint: USDC_MINT,
    })
    .signers([payer])
    .rpc();

  // Derive PDAs we expect to have been created
  const { accountV2, routeV2, routeByIdV2, vaultV2 } = derivePdas(
    payer.publicKey,
    program.programId,
    jarId,
  );

  // Verify accountV2
  const acct = await program.account.accountV2.fetch(accountV2);
  expect(acct.owner.equals(payer.publicKey)).toBe(true);
  expect(Number(acct.defaultRouteNumber)).toBe(0);
  expect(Number(acct.defaultCurrencyId)).toBe(1); // USDC
  expect(Number(acct.routeCount)).toBeGreaterThanOrEqual(1);

  // Verify routeV2
  const route = await program.account.routeV2.fetch(routeV2);
  expect(route.owner.equals(accountV2)).toBe(true);
  expect(Number(route.routeNumber)).toBe(0);
  expect(route.routeId).toBe(jarId);

  // Verify routeByIdV2 mapping
  const byId = await program.account.routeByIdV2.fetch(routeByIdV2);
  expect(Boolean(byId.routeIdTaken)).toBe(true);
  expect(byId.account.equals(accountV2)).toBe(true);
  expect(Number(byId.routeNumber)).toBe(0);

  // Verify the vault's USDC ATA exists and is owned by the vault PDA
  const vaultUsdcAta = getAssociatedTokenAddressSync(USDC_MINT, vaultV2, true);
  const ataInfo = await getSplAccount(connection, vaultUsdcAta, "confirmed");
  expect(ataInfo.mint.equals(USDC_MINT)).toBe(true);
  expect(ataInfo.owner.equals(vaultV2)).toBe(true);
  expect(ataInfo.amount === 0n).toBe(true);
});

