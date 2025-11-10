import { MiddlewareHandler } from "hono";
import { db } from "../../db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";
import { config } from "../config";
import { TOPUP_AMOUNTS, createPaymentRequirements } from "../services/x402-payment";

export const balanceCheck: MiddlewareHandler = async (c, next) => {
  const walletAddress = c.get("walletAddress");

  let user = await db.query.users.findFirst({
    where: eq(users.walletAddress, walletAddress),
  });

  if (!user) {
    [user] = await db
      .insert(users)
      .values({
        walletAddress,
        balanceUsd: "0.00000000",
      })
      .returning();
  }

  const balance = parseFloat(user.balanceUsd);

  if (balance < config.minBalance) {
    const deficit = Math.max(0, -balance);
    const requestedAmounts: number[] =
      deficit > 0
        ? [Math.max(0.1, Number((deficit + 0.1).toFixed(2)))]
        : [...TOPUP_AMOUNTS];

    const paymentRequirements = createPaymentRequirements(
      c.req.url,
      "Top-up required for API access",
      requestedAmounts,
    );

    return c.json(
      {
        x402Version: 1,
        error: {
          message: "Balance too low. Please top up.",
          type: "insufficient_balance",
          current_balance: balance.toFixed(2),
          minimum_balance: config.minBalance.toFixed(2),
          topup_required: true,
        },
        accepts: paymentRequirements,
      },
      402,
    );
  }

  c.set("user", user);
  await next();
};
