import React, { useState } from "react";
import { generateQuiz, gradeQuiz } from "../api.js";
import { useDocuments } from "../DocumentsContext.jsx";
import DirectionFilter from "../components/DirectionFilter.jsx";
import ModelSelector from "../components/ModelSelector.jsx";
import { MODEL_OPTIONS } from "../models.js";
import { ALL_DIRECTIONS } from "../directions.js";

const DEFAULT_QUIZ_MODEL = MODEL_OPTIONS.find((m) => m.value === "deepseek-v4-flash")?.value ?? MODEL_OPTIONS[0].value;

export default function QuizPage() {
  const { documents } = useDocuments();
  const [numQuestions, setNumQuestions] = useState(5);
  const [model, setModel] = useState(DEFAULT_QUIZ_MODEL);
  const [direction, setDirection] = useState(ALL_DIRECTIONS);
  const [topic, setTopic] = useState("");
  const [quizId, setQuizId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    setLoading(true);
    setError("");
    setResults(null);
    setAnswers({});
    try {
      const { quizId: id, questions: qs } = await generateQuiz({ numQuestions, model, direction, topic });
      setQuizId(id);
      setQuestions(qs);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function setAnswer(questionId, value) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      const payload = questions.map((q) => ({ questionId: q.id, answer: answers[q.id] || "" }));
      const data = await gradeQuiz({ quizId, answers: payload });
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const resultsByQuestion = results ? Object.fromEntries(results.results.map((r) => [r.questionId, r])) : {};
  const allAnswered = questions.length > 0 && questions.every((q) => (answers[q.id] || "").trim());

  return (
    <section className="page quiz-page">
      <h2>Проверь себя</h2>
      {!documents.length && (
        <p className="hint">
          Учебные материалы ещё не загружены. Перейдите на вкладку <strong>Материалы</strong>, чтобы добавить их.
        </p>
      )}
      <DirectionFilter value={direction} onChange={setDirection} disabled={loading} />
      <ModelSelector value={model} onChange={setModel} disabled={loading} />

      <div className="quiz-controls">
        <label>
          Тема (необязательно)
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Например: сопротивление в терапии"
            disabled={loading}
          />
        </label>
        <label>
          Количество вопросов
          <input
            type="number"
            min={1}
            max={15}
            value={numQuestions}
            onChange={(e) => setNumQuestions(Number(e.target.value))}
          />
        </label>
        <button onClick={handleGenerate} disabled={loading || !documents.length}>
          {questions.length ? "Сгенерировать новую викторину" : "Сгенерировать викторину"}
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}
      {loading && <p className="hint">Обработка…</p>}

      {results && (
        <div className="quiz-score">
          Результат: {results.score} / {results.total}
        </div>
      )}

      <ol className="quiz-list">
        {questions.map((q, idx) => {
          const result = resultsByQuestion[q.id];
          return (
            <li key={q.id} className="quiz-question">
              <p className="quiz-question-text">
                {idx + 1}. {q.question}
              </p>

              {q.type === "multiple_choice" ? (
                <div className="quiz-options">
                  {q.options.map((opt) => (
                    <label key={opt} className={`quiz-option ${answers[q.id] === opt ? "checked" : ""}`}>
                      <input
                        type="radio"
                        name={q.id}
                        value={opt}
                        checked={answers[q.id] === opt}
                        disabled={!!results}
                        onChange={() => setAnswer(q.id, opt)}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  rows={2}
                  placeholder="Введите ваш ответ…"
                  value={answers[q.id] || ""}
                  disabled={!!results}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                />
              )}

              {result && (
                <div className={`quiz-feedback ${result.correct === true ? "correct" : result.correct === false ? "incorrect" : "neutral"}`}>
                  {result.feedback}
                  {result.explanation && <div className="quiz-explanation">{result.explanation}</div>}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {questions.length > 0 && !results && (
        <button className="submit-quiz" onClick={handleSubmit} disabled={loading || !allAnswered}>
          Отправить ответы
        </button>
      )}
    </section>
  );
}
