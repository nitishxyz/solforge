import type { RpcMethodHandler } from "../types";
import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, AccountLayout, ACCOUNT_SIZE, MintLayout, MINT_SIZE } from "@solana/spl-token";
import { createAssociatedTokenAccountInstruction, createMintToCheckedInstruction } from "@solana/spl-token";
import { Transaction, SystemProgram, VersionedTransaction, TransactionMessage } from "@solana/web3.js";
import { parseUpgradeableLoader } from "../account/parsers/loader-upgradeable";

export const solforgeAdminCloneProgram: RpcMethodHandler = async (id, params, context) => {
  const [programId, options] = params as [string, { endpoint?: string; withAccounts?: boolean; accountsLimit?: number }?];
  if (!programId) return context.createErrorResponse(id, -32602, "Invalid params: programId required");
  const endpoint = options?.endpoint || "https://api.mainnet-beta.solana.com";
  try {
    const conn = new Connection(endpoint, "confirmed");
    const pid = new PublicKey(programId);
    const info = await conn.getAccountInfo(pid, "confirmed");
    if (!info) return context.createErrorResponse(id, -32004, "Program account not found on endpoint", { programId, endpoint });
    console.log("[admin] clone program start", { programId: pid.toBase58(), owner: info.owner.toBase58(), exec: info.executable, dataLen: info.data?.length ?? 0 });
    const ownerStr = info.owner.toBase58();
    let added = false;
    let addSource: "programData" | "program" | null = null;

    // If upgradeable loader: fetch program data, extract ELF and addProgram
    const parsed = parseUpgradeableLoader(ownerStr, new Uint8Array(info.data), context);
    if (parsed?.parsed?.type === "program") {
      const programDataAddr = parsed.parsed.info?.programData as string | undefined;
      if (programDataAddr) {
        const pda = new PublicKey(programDataAddr);
        const pinfo = await conn.getAccountInfo(pda, "confirmed");
        if (pinfo) {
          const pdataParsed = parseUpgradeableLoader(ownerStr, new Uint8Array(pinfo.data), context);
          const base64 = pdataParsed?.parsed?.info?.data?.[0] as string | undefined;
          if (base64) {
            const bytes = Uint8Array.from(Buffer.from(base64, "base64"));
            try { context.svm.addProgram(pid, bytes); added = true; addSource = "programData"; }
            catch (e) {
              console.warn("[admin] addProgram failed (programData bytes)", e);
              return context.createErrorResponse(id, -32603, "Clone program failed", { message: String(e), programId, endpoint, source: "programData" });
            }
          } else {
            console.warn("[admin] programData bytes missing");
            return context.createErrorResponse(id, -32603, "Clone program failed", { message: "ProgramData bytes missing", programId, endpoint });
          }
        }
      }
    } else {
      // Legacy loaders (bpf-loader / deprecated) keep ELF in the program account directly
      try {
        context.svm.addProgram(pid, new Uint8Array(info.data));
        added = true; addSource = "program";
      } catch (e) {
        console.warn("[admin] addProgram failed (program account data)", e);
        return context.createErrorResponse(id, -32603, "Clone program failed", { message: String(e), programId, endpoint, source: "program" });
      }
    }

    // No metadata fallback: either ELF added or fail (strict mode)

    // Optionally clone owned accounts
    if (options?.withAccounts) {
      const res = await solforgeAdminCloneProgramAccounts(id, [programId, { endpoint, limit: options.accountsLimit }], context);
      // ignore result, best-effort
      void res;
    }

    console.log("[admin] clone program done", { programId: pid.toBase58(), added: true, source: addSource });
    return context.createSuccessResponse(id, { ok: true, programId, added: true, source: addSource });
  } catch (e: any) {
    console.error("[admin] clone program error", e);
    return context.createErrorResponse(id, -32603, "Clone program failed", { message: e?.message || String(e), stack: e?.stack, programId, endpoint });
  }
};

export const solforgeAdminCloneProgramAccounts: RpcMethodHandler = async (id, params, context) => {
  const [programId, options] = params as [string, { endpoint?: string; limit?: number; filters?: unknown[] }?];
  if (!programId) return context.createErrorResponse(id, -32602, "Invalid params: programId required");
  const endpoint = options?.endpoint || "https://api.mainnet-beta.solana.com";
  const limit = options?.limit ? Math.max(1, Math.min(10000, options.limit)) : undefined;
  try {
    const conn = new Connection(endpoint, "confirmed");
    const pid = new PublicKey(programId);
    const list = await conn.getProgramAccounts(pid, {
      commitment: "confirmed",
      // @ts-ignore: filters type is loose
      filters: Array.isArray(options?.filters) ? (options!.filters as any) : undefined,
    });
    let count = 0;
    for (const { pubkey, account } of list.slice(0, limit ?? list.length)) {
      try {
        context.svm.setAccount(pubkey, {
          data: new Uint8Array(account.data as Buffer),
          executable: account.executable,
          lamports: Number(account.lamports),
          owner: account.owner,
          rentEpoch: 0,
        } as any);
        count++;
      } catch {}
    }
    return context.createSuccessResponse(id, { ok: true, count });
  } catch (e: any) {
    return context.createErrorResponse(id, -32603, "Clone program accounts failed", e?.message || String(e));
  }
};

export const solforgeAdminCloneTokenMint: RpcMethodHandler = async (id, params, context) => {
  const [mint, options] = params as [string, { endpoint?: string }?];
  if (!mint) return context.createErrorResponse(id, -32602, "Invalid params: mint required");
  const endpoint = options?.endpoint || "https://api.mainnet-beta.solana.com";
  try {
    const conn = new Connection(endpoint, "confirmed");
    const mintPk = new PublicKey(mint);
    console.log(`[admin] clone mint start`, { mint: mintPk.toBase58(), endpoint });
    const info = await conn.getAccountInfo(mintPk, "confirmed");
    if (!info) {
      console.warn(`[admin] clone mint: account not found`, { mint: mintPk.toBase58(), endpoint });
      return context.createErrorResponse(id, -32004, "Mint account not found on endpoint", { endpoint, mint });
    }
    try {
      const dec = MintLayout.decode((info.data as Buffer).slice(0, MINT_SIZE)).decimals;
      console.log(`[admin] clone mint fetched`, { owner: info.owner.toBase58(), dataLen: info.data.length, decimals: dec, lamports: info.lamports });
    } catch {}
    // Write raw account into LiteSVM
    context.svm.setAccount(mintPk, {
      data: new Uint8Array(info.data),
      executable: info.executable,
      lamports: Number(info.lamports),
      owner: info.owner,
      rentEpoch: 0,
    } as any);
    try { context.registerMint?.(mintPk); } catch {}
    console.log(`[admin] clone mint done`, { mint: mintPk.toBase58() });
    return context.createSuccessResponse(id, { ok: true, address: mint });
  } catch (e: any) {
    console.error(`[admin] clone mint error`, e);
    return context.createErrorResponse(id, -32603, "Clone mint failed", { message: e?.message || String(e), stack: e?.stack, endpoint, mint });
  }
};

export const solforgeAdminCloneTokenAccounts: RpcMethodHandler = async (id, params, context) => {
  const [mint, options] = params as [string, { endpoint?: string; holders?: number; allAccounts?: boolean }?];
  if (!mint) return context.createErrorResponse(id, -32602, "Invalid params: mint required");
  const endpoint = options?.endpoint || "https://api.mainnet-beta.solana.com";
  const limit = options?.holders && !options?.allAccounts ? Math.max(1, Math.min(10000, options.holders)) : undefined;
  try {
    const conn = new Connection(endpoint, "confirmed");
    const mintPk = new PublicKey(mint);
    let accounts: Array<{ pubkey: PublicKey; data: Buffer; lamports: number; owner: PublicKey; executable: boolean; rentEpoch: number }>; 
    if (options?.allAccounts) {
      const list = await conn.getProgramAccounts(TOKEN_PROGRAM_ID, {
        commitment: "confirmed",
        filters: [
          { dataSize: 165 },
          { memcmp: { offset: 0, bytes: mintPk.toBase58() } },
        ],
      });
      accounts = list.map(({ pubkey, account }) => ({
        pubkey,
        data: account.data as Buffer,
        lamports: account.lamports,
        owner: account.owner,
        executable: account.executable,
        rentEpoch: account.rentEpoch,
      }));
    } else if (typeof limit === "number") {
      const largest = await conn.getTokenLargestAccounts(mintPk, "confirmed");
      const addrs = largest.value.slice(0, limit).map((x) => x.address);
      const multi = await conn.getMultipleAccountsInfo(addrs, { commitment: "confirmed" });
      accounts = [];
      for (let i = 0; i < addrs.length; i++) {
        const info = multi[i];
        if (!info) continue;
        accounts.push({
          pubkey: addrs[i]!,
          data: info.data as Buffer,
          lamports: info.lamports,
          owner: info.owner,
          executable: info.executable,
          rentEpoch: info.rentEpoch,
        });
      }
    } else {
      // default: top 100 holders
      const largest = await conn.getTokenLargestAccounts(mintPk, "confirmed");
      const addrs = largest.value.slice(0, 100).map((x) => x.address);
      const multi = await conn.getMultipleAccountsInfo(addrs, { commitment: "confirmed" });
      accounts = [];
      for (let i = 0; i < addrs.length; i++) {
        const info = multi[i];
        if (!info) continue;
        accounts.push({
          pubkey: addrs[i]!,
          data: info.data as Buffer,
          lamports: info.lamports,
          owner: info.owner,
          executable: info.executable,
          rentEpoch: info.rentEpoch,
        });
      }
    }
    let count = 0;
    for (const a of accounts) {
      try {
        context.svm.setAccount(a.pubkey, {
          data: new Uint8Array(a.data),
          executable: a.executable,
          lamports: Number(a.lamports),
          owner: a.owner,
          rentEpoch: 0,
        } as any);
        count++;
      } catch {}
    }
    return context.createSuccessResponse(id, { ok: true, count });
  } catch (e: any) {
    return context.createErrorResponse(id, -32603, "Clone token accounts failed", e?.message || String(e));
  }
};

// Create or overwrite a token account (ATA) with a specified amount
export const solforgeCreateTokenAccount: RpcMethodHandler = async (id, params, context) => {
  try {
    const [mintStr, ownerStr, rawAmount, decimals] = params as [string, string | null | undefined, number | string | bigint, number?];
    if (!mintStr || rawAmount == null) return context.createErrorResponse(id, -32602, "Invalid params: mint and amount required");
    const mint = new PublicKey(mintStr);
    const owner = ownerStr ? new PublicKey(ownerStr) : context.getFaucet().publicKey;
    const ata = getAssociatedTokenAddressSync(mint, owner, true);
    // Amount is in base units (not UI). The layout stores a u64 bigint
    const amount = typeof rawAmount === "bigint" ? rawAmount : BigInt(rawAmount);
    const buf = Buffer.alloc(ACCOUNT_SIZE);
    AccountLayout.encode({
      mint,
      owner,
      amount,
      delegateOption: 0,
      delegate: PublicKey.default,
      delegatedAmount: 0n,
      state: 1,
      isNativeOption: 0,
      isNative: 0n,
      closeAuthorityOption: 0,
      closeAuthority: PublicKey.default,
    } as any, buf);

    const rentLamports = Number(context.svm.minimumBalanceForRentExemption(BigInt(ACCOUNT_SIZE)));
    context.svm.setAccount(ata, {
      lamports: rentLamports,
      data: new Uint8Array(buf),
      owner: TOKEN_PROGRAM_ID,
      executable: false,
      rentEpoch: 0,
    } as any);
    try {
      await context.store?.upsertAccounts([
        {
          address: ata.toBase58(),
          lamports: rentLamports,
          ownerProgram: TOKEN_PROGRAM_ID.toBase58(),
          executable: false,
          rentEpoch: 0,
          dataLen: ACCOUNT_SIZE,
          dataBase64: undefined,
          lastSlot: Number(context.slot),
        },
      ]);
    } catch {}
    // Record a synthetic transaction so explorers can show activity
    try {
      const sig = `admin:mint:${ata.toBase58()}:${Date.now()}`;
      await context.store?.insertTransactionBundle({
        signature: sig,
        slot: Number(context.slot),
        blockTime: Math.floor(Date.now() / 1000),
        version: "legacy",
        fee: 0,
        err: null,
        rawBase64: "",
        preBalances: [],
        postBalances: [],
        logs: ["admin mint"],
        accounts: [
          { address: ata.toBase58(), index: 0, signer: false, writable: true },
          { address: mint.toBase58(), index: 1, signer: false, writable: false },
          { address: owner.toBase58(), index: 2, signer: false, writable: false },
        ],
      });
    } catch {}
    try { context.registerMint?.(mintPk); } catch {}
    try {
      await context.store?.upsertAccounts([
        {
          address: mintPk.toBase58(),
          lamports: Number(info.lamports),
          ownerProgram: info.owner.toBase58(),
          executable: !!info.executable,
          rentEpoch: 0,
          dataLen: info.data.length,
          dataBase64: undefined,
          lastSlot: Number(context.slot),
        },
      ]);
    } catch {}
    return context.createSuccessResponse(id, { ok: true, address: ata.toBase58(), mint: mintStr, owner: owner.toBase58(), amount: amount.toString(), decimals: decimals ?? null });
  } catch (e: any) {
    return context.createErrorResponse(id, -32603, "Create token account failed", e?.message || String(e));
  }
};

// Load a program ELF into LiteSVM for a given programId
export const solforgeLoadProgram: RpcMethodHandler = async (id, params, context) => {
  try {
    const [programIdStr, elfBase64] = params as [string, string];
    if (!programIdStr || !elfBase64) return context.createErrorResponse(id, -32602, "Invalid params: programId, base64 required");
    const pid = new PublicKey(programIdStr);
    const bytes = Uint8Array.from(Buffer.from(elfBase64, "base64"));
    try { context.svm.addProgram(pid, bytes); } catch {}
    // Mirror program account metadata as executable; owner = upgradeable loader for realism
    const LOADER_UPGRADEABLE = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");
    context.svm.setAccount(pid, {
      lamports: 1_000_000_000,
      data: new Uint8Array(bytes.length), // minimal stub data for the program account itself
      owner: LOADER_UPGRADEABLE,
      executable: true,
      rentEpoch: 0,
    } as any);
    return context.createSuccessResponse(id, { ok: true, programId: programIdStr, size: bytes.length });
  } catch (e: any) {
    return context.createErrorResponse(id, -32603, "Load program failed", e?.message || String(e));
  }
};

// Create a new SPL Mint locally with given decimals and mint authority
export const solforgeCreateMint: RpcMethodHandler = async (id, params, context) => {
  try {
    const [mintStr, decimals, authorityStr] = params as [string | null | undefined, number, string | null | undefined];
    if (typeof decimals !== "number" || decimals < 0 || decimals > 18) return context.createErrorResponse(id, -32602, "Invalid params: decimals required (0-18)");
    const authority = authorityStr ? new PublicKey(authorityStr) : context.getFaucet().publicKey;
    const mintPk = mintStr ? new PublicKey(mintStr) : PublicKey.unique();

    const buf = Buffer.alloc(MINT_SIZE);
    MintLayout.encode({
      mintAuthorityOption: 1,
      mintAuthority: authority,
      supply: 0n,
      decimals,
      isInitialized: true,
      freezeAuthorityOption: 0,
      freezeAuthority: PublicKey.default,
    } as any, buf);

    const rentLamports = Number(context.svm.minimumBalanceForRentExemption(BigInt(MINT_SIZE)));
    context.svm.setAccount(mintPk, {
      lamports: rentLamports,
      data: new Uint8Array(buf),
      owner: TOKEN_PROGRAM_ID,
      executable: false,
      rentEpoch: 0,
    } as any);
    try { context.registerMint?.(mintPk); } catch {}
    try {
      await context.store?.upsertAccounts([
        {
          address: mintPk.toBase58(),
          lamports: rentLamports,
          ownerProgram: TOKEN_PROGRAM_ID.toBase58(),
          executable: false,
          rentEpoch: 0,
          dataLen: MINT_SIZE,
          dataBase64: undefined,
          lastSlot: Number(context.slot),
        },
      ]);
    } catch {}
    // Synthetic transaction for explorers
    try {
      const sig = `admin:create-mint:${mintPk.toBase58()}:${Date.now()}`;
      await context.store?.insertTransactionBundle({
        signature: sig,
        slot: Number(context.slot),
        blockTime: Math.floor(Date.now() / 1000),
        version: "legacy",
        fee: 0,
        err: null,
        rawBase64: "",
        preBalances: [],
        postBalances: [],
        logs: ["admin create mint"],
        accounts: [
          { address: mintPk.toBase58(), index: 0, signer: false, writable: true },
          { address: authority.toBase58(), index: 1, signer: false, writable: false },
        ],
      });
    } catch {}
    return context.createSuccessResponse(id, { ok: true, mint: mintPk.toBase58(), decimals, authority: authority.toBase58() });
  } catch (e: any) {
    return context.createErrorResponse(id, -32603, "Create mint failed", e?.message || String(e));
  }
};

export const solforgeListMints: RpcMethodHandler = async (id, _params, context) => {
  try {
    const list = context.listMints ? context.listMints() : [];
    return context.createSuccessResponse(id, list);
  } catch (e: any) {
    return context.createErrorResponse(id, -32603, "List mints failed", e?.message || String(e));
  }
};

// Mint via a real SPL Token transaction signed by faucet (must be mint authority)
export const solforgeMintTo: RpcMethodHandler = async (id, params, context) => {
  try {
    const [mintStr, ownerStr, rawAmount] = params as [string, string, number | string | bigint];
    if (!mintStr || !ownerStr || rawAmount == null) return context.createErrorResponse(id, -32602, "Invalid params: mint, owner, amount required");
    const mint = new PublicKey(mintStr);
    const owner = new PublicKey(ownerStr);
    const faucet = context.getFaucet();

    // Read mint to get decimals and authority
    const mintAcc = context.svm.getAccount(mint);
    if (!mintAcc) return context.createErrorResponse(id, -32004, "Mint not found in LiteSVM");
    const mintInfo = MintLayout.decode(Buffer.from(mintAcc.data).slice(0, MINT_SIZE));
    const decimals = mintInfo.decimals;
    const hasAuth = mintInfo.mintAuthorityOption === 1;
    const authPk = hasAuth ? new PublicKey(mintInfo.mintAuthority) : null;
    if (!hasAuth || !authPk || !authPk.equals(faucet.publicKey)) {
      return context.createErrorResponse(id, -32000, "Mint has no faucet authority; cannot mint real tokens");
    }

    const ata = getAssociatedTokenAddressSync(mint, owner, true);
    const ixs = [] as any[];
    const ataAcc = context.svm.getAccount(ata);
    if (!ataAcc || (ataAcc.data?.length ?? 0) < ACCOUNT_SIZE) {
      ixs.push(createAssociatedTokenAccountInstruction(faucet.publicKey, ata, owner, mint));
    }
    const amount = typeof rawAmount === "bigint" ? rawAmount : BigInt(rawAmount);
    ixs.push(createMintToCheckedInstruction(mint, ata, faucet.publicKey, amount, decimals));

    // Build a VersionedTransaction (legacy message) to ensure consistent encoding/decoding downstream
    let rb = context.svm.latestBlockhash();
    if (!rb || rb.length === 0) {
      const bh = new Uint8Array(32); crypto.getRandomValues(bh);
      rb = context.encodeBase58(bh);
    }
    const msg = new TransactionMessage({ payerKey: faucet.publicKey, recentBlockhash: rb, instructions: ixs });
    const legacy = msg.compileToLegacyMessage();
    const vtx = new VersionedTransaction(legacy);
    vtx.sign([faucet]);

    // Capture preBalances for primary accounts referenced and token pre amount
    const trackedKeys = [faucet.publicKey, ata, mint, owner];
    const preBalances = trackedKeys.map((pk) => { try { return Number(context.svm.getBalance(pk) || 0n); } catch { return 0; } });
    // Token mint decimals and pre amount
    let decsForMint = 0;
    let preTokenAmt: bigint = 0n;
    try {
      const mintAcc0 = context.svm.getAccount(mint);
      const mintInfo0 = mintAcc0 ? MintLayout.decode(Buffer.from(mintAcc0.data).slice(0, MINT_SIZE)) : undefined;
      decsForMint = Number(mintInfo0?.decimals ?? decimals ?? 0);
      const ataAcc0 = context.svm.getAccount(ata);
      if (ataAcc0 && (ataAcc0.data?.length ?? 0) >= ACCOUNT_SIZE) {
        const dec0 = AccountLayout.decode(Buffer.from(ataAcc0.data));
        preTokenAmt = BigInt(dec0.amount.toString());
      }
    } catch {}

    // Send transaction via svm
    const res = context.svm.sendTransaction(vtx);
    // Compute signature (base58) from the signed transaction
    let signatureStr = "";
    try {
      const sigBytes = vtx.signatures?.[0];
      if (sigBytes) signatureStr = context.encodeBase58(new Uint8Array(sigBytes));
    } catch {}
    if (!signatureStr) signatureStr = `mint:${ata.toBase58()}:${Date.now()}`;

    // Token balance deltas (pre/post) for ATA
    let preTokenBalances: any[] = [];
    let postTokenBalances: any[] = [];
    try {
      const decs = decsForMint;
      const ui = (n: bigint) => ({ amount: n.toString(), decimals: decs, uiAmount: Number(n) / Math.pow(10, decs), uiAmountString: (Number(n) / Math.pow(10, decs)).toString() });
      const preAmt = preTokenAmt;
      const ataPostAcc = context.svm.getAccount(ata); // after send
      const postAmt = ataPostAcc && (ataPostAcc.data?.length ?? 0) >= ACCOUNT_SIZE ? BigInt(AccountLayout.decode(Buffer.from(ataPostAcc.data)).amount.toString()) : preAmt;
      const msgAny: any = vtx.message as any;
      const rawKeys: any[] = Array.isArray(msgAny.staticAccountKeys) ? msgAny.staticAccountKeys : (Array.isArray(msgAny.accountKeys) ? msgAny.accountKeys : []);
      const keys = rawKeys.map((k: any) => { try { return typeof k === "string" ? k : new PublicKey(k).toBase58(); } catch { return String(k); } });
      const ataIndex = keys.indexOf(ata.toBase58());
      const ownerIndex = keys.indexOf(owner.toBase58());
      preTokenBalances = [{ accountIndex: ataIndex >= 0 ? ataIndex : 0, mint: mint.toBase58(), owner: owner.toBase58(), uiTokenAmount: ui(preAmt) }];
      postTokenBalances = [{ accountIndex: ataIndex >= 0 ? ataIndex : 0, mint: mint.toBase58(), owner: owner.toBase58(), uiTokenAmount: ui(postAmt) }];
    } catch {}

    // Insert into DB for explorer via context.recordTransaction for richer details
    try {
      const rawBase64 = Buffer.from(vtx.serialize()).toString("base64");
      const postBalances = trackedKeys.map((pk) => { try { return Number(context.svm.getBalance(pk) || 0n); } catch { return 0; } });
      // Best-effort logs
      const logs: string[] = ["spl-token mintToChecked"];
      // Feed through recordTransaction helper so downstream queries have consistent shape
      try { (vtx as any).serialize = () => Buffer.from(rawBase64, "base64"); } catch {}
      context.recordTransaction(signatureStr, vtx as any, {
        logs,
        fee: 0,
        blockTime: Math.floor(Date.now() / 1000),
        preBalances,
        postBalances,
        preTokenBalances,
        postTokenBalances,
      });
    } catch {}
    try { context.notifySignature(signatureStr); } catch {}

    return context.createSuccessResponse(id, { ok: true, signature: signatureStr, mint: mintStr, owner: ownerStr, amount: amount.toString() });
  } catch (e: any) {
    return context.createErrorResponse(id, -32603, "MintTo failed", e?.message || String(e));
  }
};

// Adopt faucet as mint authority for a given mint (LiteSVM-only, overwrites account data)
export const solforgeAdoptMintAuthority: RpcMethodHandler = async (id, params, context) => {
  try {
    const [mintStr] = params as [string];
    if (!mintStr) return context.createErrorResponse(id, -32602, "Invalid params: mint required");
    const mint = new PublicKey(mintStr);
    const acct = context.svm.getAccount(mint);
    if (!acct) return context.createErrorResponse(id, -32004, "Mint not found in LiteSVM");
    if (!acct.data || acct.data.length < MINT_SIZE) return context.createErrorResponse(id, -32000, "Account not a valid mint");

    const faucet = context.getFaucet();
    const buf = Buffer.from(acct.data);
    const mintDecoded = MintLayout.decode(buf.slice(0, MINT_SIZE));
    mintDecoded.mintAuthorityOption = 1 as any;
    (mintDecoded as any).mintAuthority = faucet.publicKey;
    // keep other fields unchanged
    const out = Buffer.alloc(MINT_SIZE);
    MintLayout.encode(mintDecoded as any, out);

    context.svm.setAccount(mint, {
      lamports: Number(acct.lamports || 0n),
      data: new Uint8Array(out),
      owner: TOKEN_PROGRAM_ID,
      executable: false,
      rentEpoch: 0,
    } as any);
    try { context.registerMint?.(mint); } catch {}
    try {
      await context.store?.upsertAccounts([
        {
          address: mint.toBase58(),
          lamports: Number(acct.lamports || 0n),
          ownerProgram: TOKEN_PROGRAM_ID.toBase58(),
          executable: false,
          rentEpoch: 0,
          dataLen: MINT_SIZE,
          dataBase64: undefined,
          lastSlot: Number(context.slot),
        },
      ]);
    } catch {}
    return context.createSuccessResponse(id, { ok: true, mint: mintStr, authority: faucet.publicKey.toBase58() });
  } catch (e: any) {
    return context.createErrorResponse(id, -32603, "Adopt mint authority failed", e?.message || String(e));
  }
};

export {
  type RpcMethodHandler
} from "../types";
