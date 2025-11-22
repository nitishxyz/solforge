import { Connection, PublicKey } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";

const RPC_URL = process.env.EXPO_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

export function useUSDCBalance(publicKey: string | null) {
    return useQuery({
        queryKey: ["usdc-balance", publicKey],
        queryFn: async () => {
            if (!publicKey) return 0;
            const connection = new Connection(RPC_URL);
            const accounts = await connection.getParsedTokenAccountsByOwner(new PublicKey(publicKey), {
                mint: USDC_MINT,
            });

            if (accounts.value.length === 0) return 0;

            return accounts.value.reduce((acc, account) => {
                return acc + (account.account.data.parsed.info.tokenAmount.uiAmount || 0);
            }, 0);
        },
        enabled: !!publicKey,
    });
}
