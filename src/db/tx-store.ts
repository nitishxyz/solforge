import { db } from "./index";
import { and, desc, eq, gt, lt, inArray } from "drizzle-orm";
import { transactions } from "./schema/transactions";
import { txAccounts } from "./schema/tx-accounts";
import { accounts } from "./schema/accounts";
import { addressSignatures } from "./schema/address-signatures";

export type InsertTxBundle = {
  signature: string;
  slot: number;
  blockTime?: number;
  version: 0 | "legacy";
  fee: number;
  err: unknown | null;
  rawBase64: string;
  preBalances: number[];
  postBalances: number[];
  logs: string[];
  accounts: Array<{ address: string; index: number; signer: boolean; writable: boolean; programIdIndex?: number }>;
};

export type AccountSnapshot = {
  address: string;
  lamports: number;
  ownerProgram: string;
  executable: boolean;
  rentEpoch: number;
  dataLen: number;
  dataBase64?: string | null;
  lastSlot: number;
};

export class TxStore {
  async insertTransactionBundle(bundle: InsertTxBundle): Promise<void> {
    const errJson = bundle.err ? JSON.stringify(bundle.err) : null;
    await db.transaction(async (tx) => {
      await tx
        .insert(transactions)
        .values({
          signature: bundle.signature,
          slot: bundle.slot,
          blockTime: bundle.blockTime ?? null,
          version: String(bundle.version),
          errJson,
          fee: bundle.fee,
          rawBase64: bundle.rawBase64,
          preBalancesJson: JSON.stringify(bundle.preBalances ?? []),
          postBalancesJson: JSON.stringify(bundle.postBalances ?? []),
          logsJson: JSON.stringify(bundle.logs ?? [])
        })
        .onConflictDoNothing();

      if (Array.isArray(bundle.accounts) && bundle.accounts.length > 0) {
        await tx.insert(txAccounts).values(
          bundle.accounts.map((a) => ({
            signature: bundle.signature,
            accountIndex: a.index,
            address: a.address,
            signer: a.signer ? 1 : 0,
            writable: a.writable ? 1 : 0,
            programIdIndex: a.programIdIndex ?? null
          }))
        ).onConflictDoNothing();

        await tx.insert(addressSignatures).values(
          bundle.accounts.map((a) => ({
            address: a.address,
            signature: bundle.signature,
            slot: bundle.slot,
            err: errJson ? 1 : 0,
            blockTime: bundle.blockTime ?? null
          }))
        ).onConflictDoNothing();
      }
    });
  }

  async upsertAccounts(snapshots: AccountSnapshot[]): Promise<void> {
    if (!Array.isArray(snapshots) || snapshots.length === 0) return;
    // SQLite upsert via onConflictDoUpdate
    for (const s of snapshots) {
      await db
        .insert(accounts)
        .values({
          address: s.address,
          lamports: s.lamports,
          ownerProgram: s.ownerProgram,
          executable: s.executable ? 1 : 0,
          rentEpoch: s.rentEpoch,
          dataLen: s.dataLen,
          dataBase64: s.dataBase64 ?? null,
          lastSlot: s.lastSlot
        })
        .onConflictDoUpdate({
          target: accounts.address,
          set: {
            lamports: s.lamports,
            ownerProgram: s.ownerProgram,
            executable: s.executable ? 1 : 0,
            rentEpoch: s.rentEpoch,
            dataLen: s.dataLen,
            dataBase64: s.dataBase64 ?? null,
            lastSlot: s.lastSlot
          }
        });
    }
  }

  async getTransaction(signature: string) {
    const rows = await db.select().from(transactions).where(eq(transactions.signature, signature)).limit(1);
    return rows[0] || null;
  }

  async getStatuses(signatures: string[]) {
    if (!Array.isArray(signatures) || signatures.length === 0) return new Map<string, { slot: number; err: any | null }>();
    const results = await db
      .select({ signature: transactions.signature, slot: transactions.slot, errJson: transactions.errJson })
      .from(transactions)
      .where(inArraySafe(transactions.signature, signatures));
    const map = new Map<string, { slot: number; err: any | null }>();
    for (const r of results) map.set(r.signature, { slot: Number(r.slot), err: r.errJson ? safeParse(r.errJson) : null });
    return map;
  }

  async getSignaturesForAddress(
    address: string,
    opts: { before?: string; until?: string; limit?: number } = {}
  ) {
    let beforeSlot: number | undefined;
    let untilSlot: number | undefined;
    if (opts.before) {
      const row = await this.getTransaction(opts.before);
      beforeSlot = row?.slot ? Number(row.slot) : undefined;
    }
    if (opts.until) {
      const row = await this.getTransaction(opts.until);
      untilSlot = row?.slot ? Number(row.slot) : undefined;
    }
    const limit = Math.min(Math.max(opts.limit ?? 1000, 1), 1000);

    const whereClauses = [eq(addressSignatures.address, address)] as any[];
    if (typeof beforeSlot === "number") whereClauses.push(lt(addressSignatures.slot, beforeSlot));
    if (typeof untilSlot === "number") whereClauses.push(gt(addressSignatures.slot, untilSlot));

    const rows = await db
      .select({
        signature: addressSignatures.signature,
        slot: addressSignatures.slot,
        blockTime: addressSignatures.blockTime,
        err: addressSignatures.err
      })
      .from(addressSignatures)
      .where(and(...whereClauses))
      .orderBy(desc(addressSignatures.slot))
      .limit(limit);

    return rows.map((r) => ({
      signature: r.signature,
      slot: Number(r.slot),
      err: r.err ? {} : null,
      memo: null as null,
      blockTime: r.blockTime ? Number(r.blockTime) : null,
      confirmationStatus: r.err ? "processed" : "confirmed"
    }));
  }

  async getAccountsByOwner(ownerProgram: string, limit = 1000) {
    const rows = await db
      .select()
      .from(accounts)
      .where(eq(accounts.ownerProgram, ownerProgram))
      .orderBy(desc(accounts.lastSlot))
      .limit(Math.min(Math.max(limit, 1), 1000));
    return rows;
  }

  async getBlockTimeForSlot(slot: number): Promise<number | null> {
    const rows = await db
      .select({ bt: transactions.blockTime })
      .from(transactions)
      .where(eq(transactions.slot, slot))
      .limit(1);
    const r = rows[0];
    return r?.bt != null ? Number(r.bt) : null;
  }
}

function safeParse<T = any>(s: string): T | null {
  try { return JSON.parse(s) as T; } catch { return null; }
}

function inArraySafe<T>(col: any, arr: T[]) {
  return arr.length > 0 ? inArray(col, arr as any) : eq(col, "__never__");
}
