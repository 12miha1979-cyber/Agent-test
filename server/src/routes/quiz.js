import express from "express";
import { v4 as uuidv4 } from "uuid";
import { ai, QUIZ_MODEL, isConfigured, resolveModel } from "../ai.js";
import { getCombinedText } from "../storage.js";
import { addQuiz, getQuiz } from "../quizStore.js";

const router = express.Router();

const MAX_CONTEXT_CHARS = 60000;

function stripToPublicQuestion(q) {
  const { id, type, question, options } = q;
  return { id, type, question, options };
}

function extractJson(text) {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("No JSON array found in model response.");
  return JSON.parse(text.slice(start, end + 1));
}

router.post("/generate", async (req, res) => {
  const { documentIds, numQuestions = 5, model } = req.body || {};
  const selectedModel = resolveModel(model, QUIZ_MODEL);

  if (!isConfigured()) {
    return res.status(503).json({
      error: "Ассистент не настроен. Укажите AITUNNEL_API_KEY на сервере, чтобы включить викторины.",
    });
  }

  const context = getCombinedText(documentIds).slice(0, MAX_CONTEXT_CHARS);
  if (!context.trim()) {
    return res.status(400).json({ error: "Сначала загрузите учебный материал, затем сгенерируйте викторину." });
  }

  const count = Math.min(Math.max(Number(numQuestions) || 5, 1), 15);

  const prompt = `Based on the study material below, write exactly ${count} quiz questions to test understanding of the material. Mix multiple-choice and short-answer questions. Write all question text, options, model answers, and explanations in Russian, regardless of the language of the study material.

Respond with ONLY a JSON array (no markdown fences, no commentary). Each item must have this shape:
- For multiple choice: {"type": "multiple_choice", "question": "...", "options": ["...", "...", "...", "..."], "correctAnswer": "the exact text of the correct option", "explanation": "brief explanation"}
- For short answer: {"type": "short_answer", "question": "...", "modelAnswer": "a concise correct answer", "explanation": "brief explanation"}

STUDY MATERIAL:
"""
${context}
"""`;

  try {
    const response = await ai.chat.completions.create({
      model: selectedModel,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.choices[0]?.message?.content ?? "";

    const parsed = extractJson(text);

    const questions = parsed.map((q) => ({ id: uuidv4(), ...q }));

    const quiz = addQuiz({ id: uuidv4(), questions, model: selectedModel, createdAt: new Date().toISOString() });

    res.status(201).json({ quizId: quiz.id, questions: quiz.questions.map(stripToPublicQuestion) });
  } catch (err) {
    console.error("Quiz generation error:", err);
    res.status(502).json({ error: "Не удалось сгенерировать викторину. Попробуйте ещё раз." });
  }
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

    if (question.type === "multiple_choice") {
      const correct = userAnswer.toLowerCase() === (question.correctAnswer || "").toLowerCase();
      results.push({
        questionId: question.id,
        correct,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        feedback: correct ? "Верно!" : `Не совсем. Правильный ответ: ${question.correctAnswer}`,
      });
    } else {
      results.push({
        questionId: question.id,
        type: "short_answer",
        userAnswer,
        modelAnswer: question.modelAnswer,
        explanation: question.explanation,
        needsGrading: true,
      });
    }
  }

  const shortAnswerItems = results.filter((r) => r.needsGrading);

  if (shortAnswerItems.length && isConfigured()) {
    try {
      const gradingPrompt = `Grade the following short-answer quiz responses. For each, decide if the student's answer is correct, partially correct, or incorrect compared to the model answer, and give brief encouraging feedback (1-2 sentences) written in Russian.

Respond with ONLY a JSON array, one object per item in the same order, shaped as:
{"correct": true|false, "feedback": "..."}

ITEMS:
${JSON.stringify(
  shortAnswerItems.map((r) => ({
    question: quiz.questions.find((q) => q.id === r.questionId)?.question,
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
