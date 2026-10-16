import { ConfigurationError } from "./errors.ts";

// Prices in USD. Groq prices from the Groq models page (2026-10); cached input
// is half price on models with prompt caching. A model with no price here is
// refused at start-up, because an unpriced call would slip past the budget.

export interface TokenPrice {
  kind: "tokens";
  inputPerM: number;
  cachedInputPerM: number;
  outputPerM: number;
}
export interface AudioPrice {
  kind: "audio";
  perHour: number;
  minSeconds: number;
}
export interface CharPrice {
  kind: "chars";
  perMChars: number;
}
export type Price = TokenPrice | AudioPrice | CharPrice;

const tokens = (
  inputPerM: number,
  outputPerM: number,
  cachedInputPerM = inputPerM / 2,
): TokenPrice => ({
  kind: "tokens",
  inputPerM,
  cachedInputPerM,
  outputPerM,
});

/** Rupees per US dollar for converting Sarvam's prices into the budget's currency. Review when the rate moves. */
export const INR_PER_USD = 88;

export const PRICES: Record<string, Record<string, Price>> = {
  groq: {
    "openai/gpt-oss-120b": tokens(0.15, 0.6),
    "openai/gpt-oss-20b": tokens(0.075, 0.3),
    "qwen/qwen3.8-27b": tokens(0.8, 4.0, 0.8),
    "whisper-large-v3": { kind: "audio", perHour: 0.111, minSeconds: 10 },
    "whisper-large-v3-turbo": { kind: "audio", perHour: 0.04, minSeconds: 10 },
    "canopylabs/orpheus-v1-english": { kind: "chars", perMChars: 22 },
  },
  gemini: {
    "gemini-2.5-flash": tokens(0.3, 2.5, 0.075),
    "gemini-2.5-pro": tokens(1.25, 10, 0.31),
  },
  // Sarvam prices are in rupees (docs.sarvam.ai pricing, 2026-10): speech to text
  // ₹30 an hour billed per second, Sarvam Translate and Mayura ₹20 per 10,000 characters.
  sarvam: {
    "saaras:v4": { kind: "audio", perHour: 30 / INR_PER_USD, minSeconds: 0 },
    "saaras:v3": { kind: "audio", perHour: 30 / INR_PER_USD, minSeconds: 0 },
    "sarvam-translate:v1": { kind: "chars", perMChars: (20 * 100) / INR_PER_USD },
    "mayura:v1": { kind: "chars", perMChars: (20 * 100) / INR_PER_USD },
    // Bulbul v3 text-to-speech: ₹30 per 10,000 characters.
    "bulbul:v3": { kind: "chars", perMChars: (30 * 100) / INR_PER_USD },
  },
  // OpenRouter returns the cost of each call; this entry only marks it priced.
  openrouter: {},
};

/** priceFor returns the price of a model, or null for OpenRouter (cost comes back in the response). */
export function priceFor(provider: string, model: string): Price | null {
  if (provider === "openrouter") {
    return null;
  }
  const price = PRICES[provider]?.[model];
  if (!price) {
    throw new ConfigurationError(
      `no price for ${provider}/${model}; add it to packages/gateway/src/pricing.ts`,
    );
  }
  return price;
}

export function tokenCost(
  price: TokenPrice,
  input: number,
  cached: number,
  output: number,
): number {
  const uncached = Math.max(0, input - cached);
  return (
    (uncached * price.inputPerM + cached * price.cachedInputPerM + output * price.outputPerM) / 1e6
  );
}

export function audioCost(price: AudioPrice, seconds: number): number {
  return (Math.max(seconds, price.minSeconds) * price.perHour) / 3600;
}

export function charCost(price: CharPrice, chars: number): number {
  return (chars * price.perMChars) / 1e6;
}
