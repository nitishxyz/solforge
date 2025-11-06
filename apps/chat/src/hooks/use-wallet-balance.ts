import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getWalletUSDCBalance } from "../lib/wallet-balance";

export function useWalletBalance(walletAddress: string | null) {
	const queryClient = useQueryClient();

	const query = useQuery({
		queryKey: ["walletBalance", walletAddress],
		queryFn: () => {
			if (!walletAddress) return "0.00";
			return getWalletUSDCBalance(walletAddress);
		},
		enabled: !!walletAddress,
		staleTime: 1000 * 60 * 5, // 5 minutes - balance doesn't change often
		gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
	});

	// Method to manually refresh the balance (e.g., after a payment)
	const refetch = () => {
		if (walletAddress) {
			queryClient.invalidateQueries({
				queryKey: ["walletBalance", walletAddress],
			});
		}
	};

	return {
		balance: query.data ?? null,
		isLoading: query.isLoading,
		refetch,
	};
}
