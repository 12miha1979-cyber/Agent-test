import express from "express";
import { ai, MODEL, isConfigured, resolveModel } from "../ai.js";
import { retrieveChunks } from "../retrieval.js";

const router = express.Router();

const TOP_K = 8;

function buildContext(chunks) {
  return chunks
    .map((c) => `[Источник: ${c.documentName} | Направление: ${c.direction}]\n${c.text}`)
    .join("\n\n---\n\n");
}

router.post("/", async (req, res) => {
  const { message, history, model, direction } = req.body || {};

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Необходимо ввести сообщение." });
  }

  if (!isConfigured()) {
    return res.status(503).json({
      error: "Ассистент не настроен. Укажите AITUNNEL_API_KEY на сервере, чтобы включить чат.",
    });
  }

  let chunks;
  try {
    chunks = await retrieveChunks({ query: message, direction, topK: TOP_K });
  } catch (err) {
    console.error("Retrieval error:", err);
    return res.status(502).json({ error: "Не удалось найти релевантный материал для ответа." });
  }

  if (!chunks.length) {
    return res.status(400).json({ error: "Сначала загрузите учебный материал, затем задайте вопрос по нему." });
  }

  const context = buildContext(chunks);

  const systemPrompt = `You are a friendly, patient study tutor. Below are the most relevant excerpts retrieved from the student's study material for this question — not the full documents. Each excerpt is labeled with its source filename ("Источник") and category ("Направление"). Answer the student's question using ONLY these excerpts as context. When you use information from an excerpt, mention which source filename it came from. Explain concepts clearly, break down difficult ideas, and use examples when helpful. If the answer isn't contained in the excerpts, say so honestly rather than making something up. Always respond in Russian, regardless of the language of the study material.

RELEVANT EXCERPTS:
"""
${context}
"""`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...(Array.isArray(history) ? history.slice(-10) : []),
    { role: "user", content: message },
  ];

  try {
    const response = await ai.chat.completions.create({
      model: resolveModel(model, MODEL),
      max_tokens: 1024,
      messages,
    });

    const reply = response.choices[0]?.message?.content ?? "";

    res.json({ reply });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(502).json({ error: "Не удалось получить ответ от ассистента." });
  }
});

export default router;
