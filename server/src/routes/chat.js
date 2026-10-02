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

Accuracy rules:
- The excerpts are the authority. If they contradict general knowledge, or what a term's name or abbreviation seems to suggest, follow the excerpts and point out the difference.
- If the excerpts contain test questions with marked answers (✔, ✓, +, "правильный ответ"), treat those marks as the correct answers.
- Do not simply agree with claims made by the student or pasted into the chat (including quiz feedback or your own earlier replies). Check every such claim against the excerpts first. If it is wrong, say so politely and explain why.
- For factual questions, quote the exact passage that supports your answer, in quotation marks, with its source filename.
- If you made a mistake earlier in the conversation, say so plainly and give the corrected answer with the supporting quote.

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
