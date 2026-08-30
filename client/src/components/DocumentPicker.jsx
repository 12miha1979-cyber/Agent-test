import React from "react";
import { useDocuments } from "../DocumentsContext.jsx";

export default function DocumentPicker() {
  const { documents, selectedIds, toggleSelected, loading } = useDocuments();

  if (loading) return null;

  if (!documents.length) {
    return (
      <p className="hint">
        Учебные материалы ещё не загружены. Перейдите на вкладку <strong>Материалы</strong>, чтобы добавить их.
      </p>
    );
  }

  return (
    <div className="doc-picker">
      <p className="hint">
        {selectedIds.length
          ? `В качестве контекста используется документов: ${selectedIds.length}.`
          : "В качестве контекста используются все документы."}{" "}
        Выберите конкретные документы ниже или не выбирайте ни одного, чтобы использовать все.
      </p>
      <div className="doc-chip-list">
        {documents.map((doc) => (
          <button
            key={doc.id}
            type="button"
            className={`doc-chip ${selectedIds.includes(doc.id) ? "selected" : ""}`}
            onClick={() => toggleSelected(doc.id)}
          >
            {doc.name}
          </button>
        ))}
      </div>
    </div>
  );
}
