import OpenAI from "openai";

const apiKey = process.env.AITUNNEL_API_KEY;

export const ai = apiKey
  ? new OpenAI({ apiKey, baseURL: "https://api.aitunnel.ru/v1/" })
  : null;
export const MODEL = process.env.AITUNNEL_MODEL || "claude-sonnet-4.5";
export const QUIZ_MODEL = process.env.AITUNNEL_QUIZ_MODEL || "deepseek-v4-flash";
export const EMBEDDING_MODEL = process.env.AITUNNEL_EMBEDDING_MODEL || "text-embedding-3-small";

// Models the client is allowed to request explicitly, so a request body can't
// smuggle an arbitrary model string through to AITUNNEL.
export const ALLOWED_MODELS = ["claude-sonnet-4.5", "deepseek-v4-flash"];

export function isConfigured() {
  return Boolean(ai);
}

export function resolveModel(requestedModel, fallback) {
  if (requestedModel && ALLOWED_MODELS.includes(requestedModel)) {
    return requestedModel;
  }
  return fallback;
}
