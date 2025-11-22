import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { desc } from "drizzle-orm";
import db from "../db";
import { transactions } from "../db/schema";
import type { ChatClient } from "../lib/api";
import type { Transaction } from "../lib/types";

export function useTransactionsQuery() {
    return useQuery({
        queryKey: ["transactions"],
        queryFn: async () => {
            const result = await db
                .select()
                .from(transactions)
                .orderBy(desc(transactions.createdAt));

            return result.map(t => ({
                id: t.id,
                type: t.type as "topup" | "deduction",
                amount_usd: t.amountUsd,
                tx_signature: t.txSignature,
                provider: t.provider,
                model: t.model,
                input_tokens: t.inputTokens,
                output_tokens: t.outputTokens,
                balance_after: t.balanceAfter,
                created_at: t.createdAt.toISOString(),
            })) as Transaction[];
        },
    });
}

export function useSyncTransactionsMutation(client: ChatClient | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            if (!client) return;

            // Fetch latest from API
            // TODO: In the future, we could pass a cursor/since param if API supports it
            const response = await client.getTransactions();
            const txs = response.transactions;

            if (txs.length === 0) return;

            // Save to DB
            await db.insert(transactions).values(
                txs.map(tx => ({
                    id: tx.id,
                    type: tx.type,
                    amountUsd: tx.amount_usd,
                    txSignature: tx.tx_signature,
                    provider: tx.provider,
                    model: tx.model,
                    inputTokens: tx.input_tokens,
                    outputTokens: tx.output_tokens,
                    balanceAfter: tx.balance_after,
                    createdAt: new Date(tx.created_at),
                }))
            ).onConflictDoNothing(); // Transactions are immutable

            return txs;
        },
        onSuccess: (data) => {
            if (data && data.length > 0) {
                queryClient.invalidateQueries({ queryKey: ["transactions"] });
            }
        },
    });
}
