export interface PricingRate {
  input: number;
  output: number;
}

export const PRICING: Record<string, PricingRate> = {
  "gpt-5": { input: 5.0, output: 20.0 },
  "gpt-5-pro": { input: 7.0, output: 28.0 },
  "gpt-5-mini": { input: 1.5, output: 6.0 },
  "gpt-5-nano": { input: 0.5, output: 2.0 },
  "gpt-4o": { input: 2.5, output: 10.0 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4-turbo": { input: 10.0, output: 30.0 },
  "gpt-4": { input: 30.0, output: 60.0 },
  "gpt-3.5-turbo": { input: 0.5, output: 1.5 },

  "claude-sonnet-4-5": { input: 3.0, output: 15.0 },
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
  "claude-opus-4-1": { input: 15.0, output: 75.0 },
  "claude-3-5-sonnet-20241022": { input: 3.0, output: 15.0 },
  "claude-3-5-haiku-20241022": { input: 0.8, output: 4.0 },
  "claude-3-opus-20240229": { input: 15.0, output: 75.0 },
};

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export function calculateCost(model: string, usage: TokenUsage, markup: number): number {
  const rate = PRICING[model];

  if (!rate) {
    throw new Error(`Unknown model: ${model}`);
  }

  const inputCost = (usage.inputTokens / 1_000_000) * rate.input;
  const outputCost = (usage.outputTokens / 1_000_000) * rate.output;

  return (inputCost + outputCost) * markup;
}
