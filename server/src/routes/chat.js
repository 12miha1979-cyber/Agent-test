import express from "express";
import { ai, MODEL, isConfigured, resolveModel } from "../ai.js";
import { getCombinedText } from "../storage.js";

const router = express.Router();

const MAX_CONTEXT_CHARS = 60000;

router.post("/", async (req, res) => {
  const { message, documentIds, history, model } = req.body || {};

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Необходимо ввести сообщение." });
  }

  if (!isConfigured()) {
    return res.status(503).json({
      error: "Ассистент не настроен. Укажите AITUNNEL_API_KEY на сервере, чтобы включить чат.",
    });
  }

  const context = getCombinedText(documentIds).slice(0, MAX_CONTEXT_CHARS);

  if (!context.trim()) {
    return res.status(400).json({ error: "Сначала загрузите учебный материал, затем задайте вопрос по нему." });
  }

  const systemPrompt = `You are a friendly, patient study tutor. Answer the student's questions using ONLY the study material provided below as context. Explain concepts clearly, break down difficult ideas, and use examples when helpful. If the answer isn't contained in the material, say so honestly rather than making something up. Always respond in Russian, regardless of the language of the study material.

STUDY MATERIAL:
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
