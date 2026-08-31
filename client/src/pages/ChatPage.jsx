import React, { useEffect, useRef, useState } from "react";
import { sendChatMessage } from "../api.js";
import { useDocuments } from "../DocumentsContext.jsx";
import DocumentPicker from "../components/DocumentPicker.jsx";
import ModelSelector from "../components/ModelSelector.jsx";
import { DEFAULT_MODEL } from "../models.js";

export default function ChatPage() {
  const { documents, selectedIds } = useDocuments();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setError("");
    const userMessage = { role: "user", content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      const history = nextMessages.slice(0, -1).map((m) => ({ role: m.role, content: m.content }));
      const { reply } = await sendChatMessage({
        message: text,
        documentIds: selectedIds,
        history,
        model,
      });
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="page chat-page">
      <h2>Задайте вопрос по материалу</h2>
      <DocumentPicker />
      <ModelSelector value={model} onChange={setModel} disabled={sending} />

      <div className="chat-window">
        {messages.length === 0 && (
          <p className="hint chat-empty">
            {documents.length
              ? "Задайте вопрос по загруженному материалу, чтобы начать."
              : "Сначала загрузите учебный материал, а затем возвращайтесь сюда с вопросами."}
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role}`}>
            {m.content}
          </div>
        ))}
        {sending && <div className="chat-bubble assistant typing">Печатает…</div>}
        <div ref={endRef} />
      </div>

      {error && <p className="error-text">{error}</p>}

      <form className="chat-input-row" onSubmit={handleSend}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Задайте вопрос по материалу…"
          disabled={sending}
        />
        <button type="submit" disabled={sending || !input.trim()}>
          Отправить
        </button>
      </form>
    </section>
  );
}
