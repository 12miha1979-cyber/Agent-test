import React, { useState } from "react";
import { generateQuiz, gradeQuiz } from "../api.js";
import { useDocuments } from "../DocumentsContext.jsx";
import DocumentPicker from "../components/DocumentPicker.jsx";

export default function QuizPage() {
  const { documents, selectedIds } = useDocuments();
  const [numQuestions, setNumQuestions] = useState(5);
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
      const { quizId: id, questions: qs } = await generateQuiz({ documentIds: selectedIds, numQuestions });
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
      <h2>Quiz Me</h2>
      <DocumentPicker />

      <div className="quiz-controls">
        <label>
          Number of questions
          <input
            type="number"
            min={1}
            max={15}
            value={numQuestions}
            onChange={(e) => setNumQuestions(Number(e.target.value))}
          />
        </label>
        <button onClick={handleGenerate} disabled={loading || !documents.length}>
          {questions.length ? "Generate New Quiz" : "Generate Quiz"}
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}
      {loading && <p className="hint">Working…</p>}

      {results && (
        <div className="quiz-score">
          Score: {results.score} / {results.total}
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
                  placeholder="Type your answer…"
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
          Submit Answers
        </button>
      )}
    </section>
  );
}
