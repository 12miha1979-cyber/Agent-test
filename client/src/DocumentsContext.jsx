import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { listDocuments } from "./api.js";

const DocumentsContext = createContext(null);

export function DocumentsProvider({ children }) {
  const [documents, setDocuments] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { documents: docs } = await listDocuments();
      setDocuments(docs);
      setSelectedIds((prev) => prev.filter((id) => docs.some((d) => d.id === id)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggleSelected = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <DocumentsContext.Provider
      value={{ documents, loading, refresh, selectedIds, setSelectedIds, toggleSelected }}
    >
      {children}
    </DocumentsContext.Provider>
  );
}

export function useDocuments() {
  const ctx = useContext(DocumentsContext);
  if (!ctx) throw new Error("useDocuments must be used within DocumentsProvider");
  return ctx;
}
