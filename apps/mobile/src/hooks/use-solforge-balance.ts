import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ChatClient } from "@/src/lib/api";

export function useSolforgeBalance(client: ChatClient | null) {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ["solforgeBalance", client?.constructor.name],
        queryFn: async () => {
            if (!client) return null;
            const data = await client.getBalance();
            return data.balance_usd;
        },
        enabled: !!client,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 10,
    });

    const refetch = () => {
        if (client) {
            queryClient.invalidateQueries({
                queryKey: ["solforgeBalance"],
            });
        }
    };

    return {
        balance: query.data ?? null,
        isLoading: query.isLoading,
        refetch,
    };
}
