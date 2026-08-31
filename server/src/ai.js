import OpenAI from "openai";

const apiKey = process.env.AITUNNEL_API_KEY;

export const ai = apiKey
  ? new OpenAI({ apiKey, baseURL: "https://api.aitunnel.ru/v1/" })
  : null;
export const MODEL = process.env.AITUNNEL_MODEL || "claude-sonnet-4-5";
export const QUIZ_MODEL = process.env.AITUNNEL_QUIZ_MODEL || "deepseek-v4-flash";

export function isConfigured() {
  return Boolean(ai);
}
