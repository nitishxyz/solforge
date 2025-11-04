import { Hono } from "hono";
import { walletAuth } from "../middleware/auth";
import { db } from "../../db";
import { transactions } from "../../db/schema";
import { eq, desc } from "drizzle-orm";

const txRouter = new Hono<{ Variables: { walletAddress: string } }>();

txRouter.get("/v1/transactions", walletAuth, async (c) => {
  const walletAddress = c.get("walletAddress") as string;
  const limit = parseInt(c.req.query("limit") || "50");
  const offset = parseInt(c.req.query("offset") || "0");

  const txs = await db.query.transactions.findMany({
    where: eq(transactions.walletAddress, walletAddress),
    orderBy: [desc(transactions.createdAt)],
    limit,
    offset,
  });

  const total = txs.length;

  return c.json({
    transactions: txs.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount_usd: tx.amountUsd,
      tx_signature: tx.txSignature,
      provider: tx.provider,
      model: tx.model,
      input_tokens: tx.inputTokens,
      output_tokens: tx.outputTokens,
      balance_after: tx.balanceAfter,
      created_at: tx.createdAt,
    })),
    total,
    limit,
    offset,
  });
});

export default txRouter;
