import { Resource } from "sst";

const IS_DEVNET = true;

export const config = {
  port: 4000,
  minBalance: 0.05,
  markup: 1.005,
  
  openai: {
    apiKey: Resource.OpenAiApiKey.value,
  },
  
  anthropic: {
    apiKey: Resource.AnthropicApiKey.value,
  },
  
  facilitator: {
    url: "https://facilitator.payai.network",
  },
  
  payment: {
    companyWallet: Resource.PlatformWallet.value,
    network: IS_DEVNET ? "solana-devnet" : "solana-mainnet",
    usdcMint: IS_DEVNET 
      ? "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"  // Devnet USDC
      : "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // Mainnet USDC
  },
} as const;
