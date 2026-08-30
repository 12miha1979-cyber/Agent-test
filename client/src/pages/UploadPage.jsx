import React, { useRef, useState } from "react";
import { uploadDocument, deleteDocument } from "../api.js";
import { useDocuments } from "../DocumentsContext.jsx";

const ACCEPTED = ".pdf,.docx,.txt";

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export default function UploadPage() {
  const { documents, refresh, loading } = useDocuments();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    setError("");
    setUploading(true);

    for (const file of files) {
      setProgress(0);
      try {
        await uploadDocument(file, setProgress);
      } catch (err) {
        setError(err.message);
      }
    }

    setUploading(false);
    setProgress(0);
    await refresh();
  }

  async function handleDelete(id) {
    try {
      await deleteDocument(id);
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="page upload-page">
      <h2>Учебные материалы</h2>
      <p className="subtitle">
        Загрузите файлы PDF, Word (.docx) или обычный текст, чтобы использовать их как контекст для чата и викторин.
      </p>

      <div
        className={`dropzone ${dragActive ? "drag-active" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p className="dropzone-icon">⬆️</p>
        <p>
          <strong>Нажмите, чтобы выбрать файлы</strong> или перетащите их сюда
        </p>
        <p className="hint">PDF, DOCX, TXT — до 20 МБ каждый</p>
      </div>

      {uploading && (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}

      {error && <p className="error-text">{error}</p>}

      <h3>Загружено ({documents.length})</h3>
      {loading ? (
        <p className="hint">Загрузка…</p>
      ) : documents.length === 0 ? (
        <p className="hint">Пока ничего не загружено.</p>
      ) : (
        <ul className="doc-list">
          {documents.map((doc) => (
            <li key={doc.id} className="doc-list-item">
              <div>
                <div className="doc-name">{doc.name}</div>
                <div className="doc-meta">
                  {formatSize(doc.size)} · извлечено символов: {doc.textLength.toLocaleString()}
                </div>
              </div>
              <button className="icon-button" onClick={() => handleDelete(doc.id)} aria-label={`Удалить ${doc.name}`}>
                🗑️
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
