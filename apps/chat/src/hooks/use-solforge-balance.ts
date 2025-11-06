import { useState, useEffect, useCallback } from "react";
import type { ChatClient } from "../lib/api";

export function useSolforgeBalance(client: ChatClient | null) {
	const [balance, setBalance] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	// Fetch initial balance
	useEffect(() => {
		async function fetchBalance() {
			if (!client) return;

			setIsLoading(true);
			try {
				const data = await client.getBalance();
				setBalance(data.balance_usd);
			} catch (err) {
				console.error("Failed to fetch SolForge balance:", err);
			} finally {
				setIsLoading(false);
			}
		}

		fetchBalance();
	}, [client]);

	// Method to update balance (called after streaming completes with new balance)
	const updateBalance = useCallback((newBalance: string) => {
		setBalance(newBalance);
	}, []);

	return {
		balance,
		isLoading,
		updateBalance,
	};
}
