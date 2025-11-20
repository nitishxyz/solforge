export interface PricingRate {
  input: number;
  output: number;
}

export const PRICING: Record<string, PricingRate> = {
  // OpenAI
  "codex-mini-latest": { input: 1.5, output: 6.0 },
  "gpt-3.5-turbo": { input: 0.5, output: 1.5 },
  "gpt-4": { input: 30.0, output: 60.0 },
  "gpt-4-turbo": { input: 10.0, output: 30.0 },
  "gpt-4.1": { input: 2.0, output: 8.0 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4.1-nano": { input: 0.1, output: 0.4 },
  "gpt-4o": { input: 2.5, output: 10.0 },
  "gpt-4o-2024-05-13": { input: 5.0, output: 15.0 },
  "gpt-4o-2024-08-06": { input: 2.5, output: 10.0 },
  "gpt-4o-2024-11-20": { input: 2.5, output: 10.0 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-5": { input: 1.25, output: 10.0 },
  "gpt-5-chat-latest": { input: 1.25, output: 10.0 },
  "gpt-5-codex": { input: 1.25, output: 10.0 },
  "gpt-5-mini": { input: 0.25, output: 2.0 },
  "gpt-5-nano": { input: 0.05, output: 0.4 },
  "gpt-5-pro": { input: 15.0, output: 120.0 },
  "gpt-5.1": { input: 1.25, output: 10.0 },
  "gpt-5.1-chat-latest": { input: 1.25, output: 10.0 },
  "gpt-5.1-codex": { input: 1.25, output: 10.0 },
  "gpt-5.1-codex-mini": { input: 0.25, output: 2.0 },
  o1: { input: 15.0, output: 60.0 },
  "o1-mini": { input: 1.1, output: 4.4 },
  "o1-preview": { input: 15.0, output: 60.0 },
  "o1-pro": { input: 150.0, output: 600.0 },
  o3: { input: 2.0, output: 8.0 },
  "o3-deep-research": { input: 10.0, output: 40.0 },
  "o3-mini": { input: 1.1, output: 4.4 },
  "o3-pro": { input: 20.0, output: 80.0 },
  "o4-mini": { input: 1.1, output: 4.4 },
  "o4-mini-deep-research": { input: 2.0, output: 8.0 },
  "text-embedding-3-large": { input: 0.13, output: 0 },
  "text-embedding-3-small": { input: 0.02, output: 0 },
  "text-embedding-ada-002": { input: 0.1, output: 0 },

  // Anthropic
  "claude-3-5-haiku-20241022": { input: 0.8, output: 4.0 },
  "claude-3-5-haiku-latest": { input: 0.8, output: 4.0 },
  "claude-3-5-sonnet-20240620": { input: 3.0, output: 15.0 },
  "claude-3-5-sonnet-20241022": { input: 3.0, output: 15.0 },
  "claude-3-7-sonnet-20250219": { input: 3.0, output: 15.0 },
  "claude-3-7-sonnet-latest": { input: 3.0, output: 15.0 },
  "claude-3-haiku-20240307": { input: 0.25, output: 1.25 },
  "claude-3-opus-20240229": { input: 15.0, output: 75.0 },
  "claude-3-sonnet-20240229": { input: 3.0, output: 15.0 },
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
  "claude-haiku-4-5-20251001": { input: 1.0, output: 5.0 },
  "claude-opus-4-0": { input: 15.0, output: 75.0 },
  "claude-opus-4-1": { input: 15.0, output: 75.0 },
  "claude-opus-4-1-20250805": { input: 15.0, output: 75.0 },
  "claude-opus-4-20250514": { input: 15.0, output: 75.0 },
  "claude-sonnet-4-0": { input: 3.0, output: 15.0 },
  "claude-sonnet-4-20250514": { input: 3.0, output: 15.0 },
  "claude-sonnet-4-5": { input: 3.0, output: 15.0 },
  "claude-sonnet-4-5-20250929": { input: 3.0, output: 15.0 },
};

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedInputTokens?: number;
}

export function calculateCost(model: string, usage: TokenUsage, markup: number): number {
  const rate = PRICING[model];

  if (!rate) {
    throw new Error(`Unknown model: ${model}`);
  }

  const cached = usage.cachedInputTokens ?? 0;
  const billableInputTokens = Math.max(0, usage.inputTokens - cached);

  const inputCost = (billableInputTokens / 1_000_000) * rate.input;
  const outputCost = (usage.outputTokens / 1_000_000) * rate.output;

  return (inputCost + outputCost) * markup;
}
