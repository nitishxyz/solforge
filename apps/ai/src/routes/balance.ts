import { Hono } from "hono";
import { walletAuth } from "../middleware/auth";
import { db } from "../../db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";

const balance = new Hono<{ Variables: { walletAddress: string } }>();

balance.get("/v1/balance", walletAuth, async (c) => {
  const walletAddress = c.get("walletAddress") as string;

  const user = await db.query.users.findFirst({
    where: eq(users.walletAddress, walletAddress),
  });

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json({
    wallet_address: user.walletAddress,
    balance_usd: user.balanceUsd,
    total_spent: user.totalSpent,
    total_topups: user.totalTopups,
    request_count: user.requestCount,
    last_payment: user.lastPayment,
    last_request: user.lastRequest,
  });
});

export default balance;
