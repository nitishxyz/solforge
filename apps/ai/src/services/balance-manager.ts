import { db } from "../../db";
import { users, transactions } from "../../db/schema";
import { eq } from "drizzle-orm";
import { calculateCost } from "./pricing";
import type { TokenUsage } from "./pricing";

export async function deductCost(
	walletAddress: string,
	provider: string,
	model: string,
	usage: TokenUsage,
	markup: number,
): Promise<{ cost: number; newBalance: number }> {
	const cost = calculateCost(model, usage, markup);

	console.log("💰 Cost calculation:");
	console.log("  Model:", model);
	console.log("  Usage:", usage);
	console.log("  Markup:", markup);
	console.log("  Cost:", cost);
	console.log("  Cost.toFixed(8):", cost.toFixed(8));

	const result = await db.transaction(async (tx) => {
		const user = await tx.query.users.findFirst({
			where: eq(users.walletAddress, walletAddress),
		});

		if (!user) {
			console.error("❌ User not found:", walletAddress);
			throw new Error("User not found");
		}

		const oldBalance = parseFloat(user.balanceUsd);
		const newBalance = oldBalance - cost;

		console.log("💳 Balance update:");
		console.log("  Old balance:", oldBalance.toFixed(8));
		console.log("  Cost:", cost.toFixed(8));
		console.log("  New balance:", newBalance.toFixed(8));

		if (newBalance < 0) {
			console.error(
				"❌ Insufficient balance. Required:",
				cost.toFixed(8),
				"Available:",
				oldBalance.toFixed(8),
			);
			throw new Error("Insufficient balance");
		}

		await tx
			.update(users)
			.set({
				balanceUsd: newBalance.toFixed(8),
				totalSpent: (parseFloat(user.totalSpent) + cost).toFixed(8),
				requestCount: user.requestCount + 1,
				lastRequest: new Date(),
			})
			.where(eq(users.walletAddress, walletAddress));

		await tx.insert(transactions).values({
			walletAddress,
			type: "deduction",
			amountUsd: cost.toFixed(8),
			provider,
			model,
			inputTokens: usage.inputTokens,
			outputTokens: usage.outputTokens,
			totalTokens: usage.totalTokens,
			balanceBefore: oldBalance.toFixed(8),
			balanceAfter: newBalance.toFixed(8),
		});

		console.log("✅ Balance deduction complete");

		return { cost, newBalance };
	});

	return result;
}
