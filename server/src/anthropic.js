import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;

export const anthropic = apiKey ? new Anthropic({ apiKey }) : null;
export const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

export function isConfigured() {
  return Boolean(anthropic);
}
