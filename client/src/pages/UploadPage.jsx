import React, { useRef, useState } from "react";
import { uploadDocument, deleteDocument } from "../api.js";
import { useDocuments } from "../DocumentsContext.jsx";
import { DIRECTIONS, directionSlug } from "../directions.js";

const ACCEPTED = ".pdf,.docx,.txt";

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export default function UploadPage() {
  const { documents, refresh, loading } = useDocuments();
  const [direction, setDirection] = useState(DIRECTIONS[0]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingFile, setProcessingFile] = useState(null);
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
      setProcessingFile(null);
      try {
        await uploadDocument(file, direction, (pct) => {
          setProgress(pct);
          if (pct >= 100) setProcessingFile(file.name);
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setProcessingFile(null);
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

      <div className="direction-picker">
        <p className="hint">Направление загружаемого файла</p>
        <div className="direction-options">
          {DIRECTIONS.map((d) => (
            <label key={d} className={`direction-option ${direction === d ? "checked" : ""}`}>
              <input
                type="radio"
                name="direction"
                value={d}
                checked={direction === d}
                onChange={() => setDirection(d)}
              />
              {d}
            </label>
          ))}
        </div>
      </div>

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

      {uploading && !processingFile && (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}

      {processingFile && (
        <p className="hint processing-hint">
          Обработка «{processingFile}»: разбиение на фрагменты и создание эмбеддингов…
        </p>
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
                <div className="doc-name">
                  {doc.name}
                  {doc.direction && (
                    <span className={`direction-badge ${directionSlug(doc.direction)}`}>{doc.direction}</span>
                  )}
                </div>
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
