import express from "express";
import { anthropic, MODEL, isConfigured } from "../anthropic.js";
import { getCombinedText } from "../storage.js";

const router = express.Router();

const MAX_CONTEXT_CHARS = 60000;

router.post("/", async (req, res) => {
  const { message, documentIds, history } = req.body || {};

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Message is required." });
  }

  if (!isConfigured()) {
    return res.status(503).json({
      error: "The assistant is not configured. Set ANTHROPIC_API_KEY on the server to enable chat.",
    });
  }

  const context = getCombinedText(documentIds).slice(0, MAX_CONTEXT_CHARS);

  if (!context.trim()) {
    return res.status(400).json({ error: "Upload study material first, then ask a question about it." });
  }

  const systemPrompt = `You are a friendly, patient study tutor. Answer the student's questions using ONLY the study material provided below as context. Explain concepts clearly, break down difficult ideas, and use examples when helpful. If the answer isn't contained in the material, say so honestly rather than making something up.

STUDY MATERIAL:
"""
${context}
"""`;

  const messages = [
    ...(Array.isArray(history) ? history.slice(-10) : []),
    { role: "user", content: message },
  ];

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const reply = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    res.json({ reply });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(502).json({ error: "Failed to get a response from the assistant." });
  }
});

export default router;
