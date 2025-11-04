import { Hono } from "hono";
import { walletAuth } from "../middleware/auth";
import { db } from "../../db";
import { users, transactions, paymentLogs } from "../../db/schema";
import { eq } from "drizzle-orm";
import { config } from "../config";
import {
  isSupportedTopupAmount,
  settlePayment,
  usdcToUsd,
  type PaymentRequirement,
  type X402PaymentPayload,
} from "../services/x402-payment";

const topup = new Hono<{ Variables: { walletAddress: string } }>();

topup.post("/v1/topup", walletAuth, async (c) => {
  const walletAddress = c.get("walletAddress") as string;
  const body = await c.req.json();

  const { paymentPayload, paymentRequirement } = body as {
    paymentPayload: X402PaymentPayload;
    paymentRequirement?: PaymentRequirement;
  };

  if (!paymentPayload || !paymentPayload.payload?.transaction) {
    return c.json({ error: "Missing payment payload" }, 400);
  }

  if (!paymentRequirement) {
    return c.json({ error: "Missing payment requirement" }, 400);
  }

  if (paymentRequirement.scheme !== "exact") {
    return c.json({ error: "Unsupported payment scheme" }, 400);
  }

  if (paymentRequirement.network !== config.payment.network) {
    return c.json({ error: "Unsupported network" }, 400);
  }

  if (!isSupportedTopupAmount(paymentRequirement.maxAmountRequired)) {
    return c.json({ error: "Unsupported top-up amount" }, 400);
  }

  if (paymentRequirement.asset !== config.payment.usdcMint) {
    return c.json({ error: "Unsupported asset" }, 400);
  }

  if (paymentRequirement.payTo !== config.payment.companyWallet) {
    return c.json({ error: "Invalid payment destination" }, 400);
  }

  try {
    const requirementUrl = new URL(paymentRequirement.resource);
    const requestUrl = new URL(c.req.url);
    if (requirementUrl.host !== requestUrl.host) {
      return c.json({ error: "Invalid payment resource host" }, 400);
    }
  } catch {
    return c.json({ error: "Invalid payment resource" }, 400);
  }

  let settlement;
  try {
    settlement = await settlePayment(paymentPayload, paymentRequirement);
  } catch (error: any) {
    return c.json(
      { error: "Payment verification failed", details: error.message },
      400
    );
  }

  if (!settlement.success) {
    return c.json(
      {
        error: "Payment settlement failed",
        reason: settlement.errorReason,
      },
      400
    );
  }

  const txSignature = settlement.transaction;
  const amount = usdcToUsd(paymentRequirement.maxAmountRequired);

  const existingLog = await db.query.paymentLogs.findFirst({
    where: eq(paymentLogs.txSignature, txSignature),
  });

  if (existingLog) {
    return c.json({ error: "Transaction already processed" }, 400);
  }

  const result = await db.transaction(async (tx) => {
    let user = await tx.query.users.findFirst({
      where: eq(users.walletAddress, walletAddress),
    });

    if (!user) {
      const inserted = await tx
        .insert(users)
        .values({
          walletAddress,
          balanceUsd: "0.00000000",
        })
        .returning();
      user = inserted[0];
    }

    if (!user) {
      throw new Error("Unable to initialize user record");
    }

    const oldBalance = parseFloat(user.balanceUsd);
    const newBalance = oldBalance + amount;

    await tx
      .update(users)
      .set({
        balanceUsd: newBalance.toFixed(8),
        totalTopups: (parseFloat(user.totalTopups) + amount).toFixed(2),
        lastPayment: new Date(),
      })
      .where(eq(users.walletAddress, walletAddress));

    await tx.insert(transactions).values({
      walletAddress,
      type: "topup",
      amountUsd: amount.toFixed(8),
      txSignature,
      topupAmount: amount.toFixed(2),
      balanceBefore: oldBalance.toFixed(8),
      balanceAfter: newBalance.toFixed(8),
    });

    await tx.insert(paymentLogs).values({
      walletAddress,
      txSignature,
      amountUsd: amount.toFixed(2),
      status: "confirmed",
      verified: true,
      facilitatorUrl: settlement.network,
      verifiedAt: new Date(),
    });

    return { success: true, newBalance };
  });

  return c.json({
    success: true,
    amount,
    new_balance: result.newBalance.toFixed(8),
    amount_usd: amount.toFixed(2),
    transaction: txSignature,
  });
});

export default topup;
