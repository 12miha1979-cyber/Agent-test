import express from "express";
import { v4 as uuidv4 } from "uuid";
import { ai, QUIZ_MODEL, isConfigured, resolveModel } from "../ai.js";
import { retrieveChunks } from "../retrieval.js";
import { addQuiz, getQuiz } from "../quizStore.js";

const router = express.Router();

const TOP_K = 10;

function stripToPublicQuestion(q) {
  const { id, type, question, options } = q;
  return { id, type, question, options };
}

function extractJson(text) {
  const start = text.indexOf("[");
  if (start === -1) throw new Error("No JSON array found in model response.");
  const end = text.lastIndexOf("]");
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    // The reply was likely cut off at max_tokens: keep every complete question.
    const lastObject = text.lastIndexOf("}");
    if (lastObject <= start) throw new Error("Model response is not valid JSON.");
    return JSON.parse(text.slice(start, lastObject + 1) + "]");
  }
}

function buildContext(chunks) {
  return chunks
    .map((c) => `[Источник: ${c.documentName} | Направление: ${c.direction}]\n${c.text}`)
    .join("\n\n---\n\n");
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[«»"'“”„`✔✓✅•*]/g, "")
    .replace(/[—–-]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

// Models often shorten a quote with "..." or wrap it in punctuation; accept the
// quote when every substantial fragment of it occurs verbatim in the material.
function quoteFound(quote, normalizedContext) {
  const parts = normalize(quote)
    .split(/\.\.\.|…/)
    .map((p) => p.replace(/^[\s.,;:!?()-]+|[\s.,;:!?()-]+$/g, ""))
    .filter((p) => p.length >= 5);
  const total = parts.reduce((n, p) => n + p.length, 0);
  return total >= 10 && parts.every((p) => normalizedContext.includes(p));
}

// A question is kept only if its answer is traceable to the material: the
// quoted passage must really occur in the retrieved excerpts, and a
// multiple-choice answer must be one of its own options. This stops the model
// from substituting general knowledge for what the material actually says.
function isGrounded(q, normalizedContext) {
  if (!quoteFound(q.sourceQuote, normalizedContext)) return false;
  if (q.type === "multiple_choice") {
    return Array.isArray(q.options) && q.options.some((o) => normalize(o) === normalize(q.correctAnswer));
  }
  return q.type === "short_answer" && Boolean(q.modelAnswer);
}

function sourceFor(quote, chunks) {
  return chunks.find((c) => quoteFound(quote, normalize(c.text)))?.documentName ?? null;
}

router.post("/generate", async (req, res) => {
  const { numQuestions = 5, model, direction, topic } = req.body || {};
  const selectedModel = resolveModel(model, QUIZ_MODEL);

  if (!isConfigured()) {
    return res.status(503).json({
      error: "Ассистент не настроен. Укажите AITUNNEL_API_KEY на сервере, чтобы включить викторины.",
    });
  }

  const trimmedTopic = typeof topic === "string" ? topic.trim() : "";
  const query = trimmedTopic || direction || "ключевые понятия и важные факты";
  const count = Math.min(Math.max(Number(numQuestions) || 5, 1), 15);

  let chunks;
  try {
    // A bigger quiz needs more material to draw distinct, quotable questions from.
    chunks = await retrieveChunks({ query, direction, topK: Math.min(Math.max(TOP_K, count * 2), 24) });
  } catch (err) {
    console.error("Retrieval error:", err);
    return res.status(502).json({ error: "Не удалось найти релевантный материал для викторины." });
  }

  if (!chunks.length) {
    return res.status(400).json({ error: "Сначала загрузите учебный материал, затем сгенерируйте викторину." });
  }

  const context = buildContext(chunks);

  const buildPrompt = (n, avoid) => `Based on the study material excerpts below, write exactly ${n} quiz questions to test understanding of the material${trimmedTopic ? ` about "${trimmedTopic}"` : ""}. Mix multiple-choice and short-answer questions. Write all question text, options, model answers, and explanations in Russian, regardless of the language of the study material.${
    avoid.length
      ? `\n\nDo NOT repeat or rephrase these questions, which are already in the quiz — cover other facts from the excerpts:\n${avoid.map((q) => `- ${q}`).join("\n")}`
      : ""
  }

STRICT RULES FOR CORRECT ANSWERS:
1. Every correct answer must be stated explicitly in the excerpts. Never use general knowledge, and never infer an answer from a term's name or abbreviation (e.g. the letter order of an acronym does not define a sequence).
2. If the material contradicts common knowledge, the material wins.
3. If the excerpts contain test questions with marked answers (✔, ✓, +, "правильный ответ", bold, etc.), those marked answers are authoritative — reuse them exactly.
4. Only ask questions whose answer you can support with a verbatim quote. If you cannot, skip that question.

Respond with ONLY a JSON array (no markdown fences, no commentary). Each item must have this shape:
- For multiple choice: {"type": "multiple_choice", "question": "...", "options": ["...", "...", "...", "..."], "correctAnswer": "the exact text of the correct option", "explanation": "brief explanation", "sourceQuote": "..."}
- For short answer: {"type": "short_answer", "question": "...", "modelAnswer": "a concise correct answer", "explanation": "brief explanation", "sourceQuote": "..."}

"sourceQuote" must be copied VERBATIM, character for character, from the excerpts (one continuous passage of 10-300 characters, without the [Источник: ...] label) and must directly show the correct answer. Do not translate or paraphrase it.

STUDY MATERIAL EXCERPTS:
"""
${context}
"""`;

  // Some questions are always dropped by the grounding check, so ask for a few
  // extra and, if still short, run up to two more rounds for the remainder.
  const MAX_ROUNDS = 3;
  const normalizedContext = normalize(chunks.map((c) => c.text).join("\n"));
  const collected = [];
  const seen = new Set();
  let lastError = null;

  for (let round = 1; round <= MAX_ROUNDS && collected.length < count; round++) {
    const remaining = count - collected.length;
    const ask = Math.min(remaining + Math.max(2, Math.ceil(remaining / 2)), 20);
    let text = "";
    try {
      const response = await ai.chat.completions.create({
        model: selectedModel,
        max_tokens: 6000,
        messages: [{ role: "user", content: buildPrompt(ask, collected.map((q) => q.question)) }],
      });
      text = response.choices[0]?.message?.content ?? "";
      const parsed = extractJson(text);

      const rejected = [];
      for (const q of parsed) {
        const key = normalize(q.question);
        if (!isGrounded(q, normalizedContext)) {
          rejected.push(q);
        } else if (key && !seen.has(key) && collected.length < count) {
          seen.add(key);
          collected.push(q);
        }
      }
      if (rejected.length) {
        console.warn(
          `Quiz generation round ${round}: dropped ${rejected.length} of ${parsed.length} questions not grounded in the material:`,
          rejected.map((q) => ({ question: q.question, sourceQuote: q.sourceQuote }))
        );
      }
    } catch (err) {
      lastError = err;
      console.error(`Quiz generation round ${round} error:`, err, "\nModel reply (first 1500 chars):", text.slice(0, 1500));
    }
  }

  if (!collected.length) {
    return res.status(502).json({
      error: lastError
        ? "Не удалось сгенерировать викторину. Попробуйте ещё раз."
        : "Не удалось составить вопросы, подтверждённые материалом. Попробуйте ещё раз или выберите модель Claude Sonnet.",
    });
  }

  if (collected.length < count) {
    console.warn(`Quiz generation: only ${collected.length} of ${count} requested questions are grounded in the material.`);
  }

  const questions = collected.map((q) => ({ id: uuidv4(), ...q, source: sourceFor(q.sourceQuote, chunks) }));
  const quiz = addQuiz({ id: uuidv4(), questions, model: selectedModel, createdAt: new Date().toISOString() });

  res.status(201).json({ quizId: quiz.id, requested: count, questions: quiz.questions.map(stripToPublicQuestion) });
});

router.post("/grade", async (req, res) => {
  const { quizId, answers } = req.body || {};

  const quiz = getQuiz(quizId);
  if (!quiz) {
    return res.status(404).json({ error: "Викторина не найдена. Возможно, она устарела — сгенерируйте новую." });
  }

  if (!Array.isArray(answers)) {
    return res.status(400).json({ error: "Необходим массив ответов." });
  }

  const results = [];

  for (const submitted of answers) {
    const question = quiz.questions.find((q) => q.id === submitted.questionId);
    if (!question) continue;

    const userAnswer = (submitted.answer || "").trim();

    const evidence = { source: question.source, sourceQuote: question.sourceQuote };

    if (question.type === "multiple_choice") {
      const correct = normalize(userAnswer) === normalize(question.correctAnswer);
      results.push({
        questionId: question.id,
        correct,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        feedback: correct ? "Верно!" : `Не совсем. Правильный ответ: ${question.correctAnswer}`,
        ...evidence,
      });
    } else {
      results.push({
        questionId: question.id,
        type: "short_answer",
        userAnswer,
        modelAnswer: question.modelAnswer,
        explanation: question.explanation,
        needsGrading: true,
        ...evidence,
      });
    }
  }

  const shortAnswerItems = results.filter((r) => r.needsGrading);

  if (shortAnswerItems.length && isConfigured()) {
    try {
      const gradingPrompt = `Grade the following short-answer quiz responses and give brief encouraging feedback (1-2 sentences) written in Russian.

How to judge:
- "sourceQuote" is a verbatim excerpt from the student's study material and is the AUTHORITATIVE answer key. If "modelAnswer" disagrees with "sourceQuote", trust "sourceQuote".
- Never use general knowledge or the name/letters of a term to decide what is correct — only the source quote.
- Judge meaning, not formatting: "СЭРМ", "С-Э-Р-М" and "Ситуация, Эмоции, Реакция, Мысли" are the same answer.
- If the answer is wrong, the feedback must state the correct answer exactly as the source quote gives it.

Respond with ONLY a JSON array, one object per item in the same order, shaped as:
{"correct": true|false, "feedback": "..."}

ITEMS:
${JSON.stringify(
  shortAnswerItems.map((r) => ({
    question: quiz.questions.find((q) => q.id === r.questionId)?.question,
    sourceQuote: r.sourceQuote,
    modelAnswer: r.modelAnswer,
    studentAnswer: r.userAnswer,
  })),
  null,
  2
)}`;

      const response = await ai.chat.completions.create({
        model: quiz.model || QUIZ_MODEL,
        max_tokens: 1024,
        messages: [{ role: "user", content: gradingPrompt }],
      });

      const text = response.choices[0]?.message?.content ?? "";

      const start = text.indexOf("[");
      const end = text.lastIndexOf("]");
      const graded = JSON.parse(text.slice(start, end + 1));

      shortAnswerItems.forEach((item, i) => {
        item.correct = graded[i]?.correct ?? false;
        item.feedback = graded[i]?.feedback ?? "Спасибо за ваш ответ.";
        delete item.needsGrading;
      });
    } catch (err) {
      console.error("Short answer grading error:", err);
      shortAnswerItems.forEach((item) => {
        item.correct = null;
        item.feedback = `Не удалось автоматически проверить этот ответ. Сравните с эталонным ответом: ${item.modelAnswer}`;
        delete item.needsGrading;
      });
    }
  } else {
    shortAnswerItems.forEach((item) => {
      item.correct = null;
      item.feedback = `Сравните с эталонным ответом: ${item.modelAnswer}`;
      delete item.needsGrading;
    });
  }

  const score = results.filter((r) => r.correct).length;
  res.json({ score, total: results.length, results });
});

export default router;
