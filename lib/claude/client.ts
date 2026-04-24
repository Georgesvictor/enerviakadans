import Anthropic from "@anthropic-ai/sdk";

let cached: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (cached) return cached;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY ontbreekt");
  cached = new Anthropic({ apiKey: key });
  return cached;
}

export const MODELS = {
  /** Hoofdmodel voor extractie + samenvattingen */
  sonnet: "claude-sonnet-4-6" as const,
  /** Goedkope validator / correcties */
  haiku: "claude-haiku-4-5-20251001" as const,
};
