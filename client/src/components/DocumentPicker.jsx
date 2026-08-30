import React from "react";
import { useDocuments } from "../DocumentsContext.jsx";

export default function DocumentPicker() {
  const { documents, selectedIds, toggleSelected, loading } = useDocuments();

  if (loading) return null;

  if (!documents.length) {
    return (
      <p className="hint">
        No study materials uploaded yet. Head to the <strong>Materials</strong> tab to add some.
      </p>
    );
  }

  return (
    <div className="doc-picker">
      <p className="hint">
        Using {selectedIds.length ? selectedIds.length : "all"} document{selectedIds.length === 1 ? "" : "s"} as
        context. Select specific ones below, or leave none selected to use everything.
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
