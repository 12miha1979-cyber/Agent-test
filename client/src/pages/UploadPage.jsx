import React, { useRef, useState } from "react";
import { uploadDocument, deleteDocument } from "../api.js";
import { useDocuments } from "../DocumentsContext.jsx";

const ACCEPTED = ".pdf,.docx,.txt";

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
      <h2>Study Materials</h2>
      <p className="subtitle">Upload PDF, Word (.docx), or plain text files to use as context for chat and quizzes.</p>

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
          <strong>Tap to choose files</strong> or drag & drop here
        </p>
        <p className="hint">PDF, DOCX, TXT — up to 20MB each</p>
      </div>

      {uploading && (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}

      {error && <p className="error-text">{error}</p>}

      <h3>Uploaded ({documents.length})</h3>
      {loading ? (
        <p className="hint">Loading…</p>
      ) : documents.length === 0 ? (
        <p className="hint">Nothing uploaded yet.</p>
      ) : (
        <ul className="doc-list">
          {documents.map((doc) => (
            <li key={doc.id} className="doc-list-item">
              <div>
                <div className="doc-name">{doc.name}</div>
                <div className="doc-meta">
                  {formatSize(doc.size)} · {doc.textLength.toLocaleString()} characters extracted
                </div>
              </div>
              <button className="icon-button" onClick={() => handleDelete(doc.id)} aria-label={`Remove ${doc.name}`}>
                🗑️
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
