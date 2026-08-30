import React from "react";
import { NavLink, Route, Routes, Navigate } from "react-router-dom";
import { DocumentsProvider } from "./DocumentsContext.jsx";
import UploadPage from "./pages/UploadPage.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import QuizPage from "./pages/QuizPage.jsx";

export default function App() {
  return (
    <DocumentsProvider>
      <div className="app-shell">
        <header className="app-header">
          <h1>📚 ИИ-репетитор</h1>
        </header>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<Navigate to="/upload" replace />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/quiz" element={<QuizPage />} />
          </Routes>
        </main>

        <nav className="bottom-nav">
          <NavLink to="/upload" className={({ isActive }) => (isActive ? "active" : "")}>
            <span className="icon" aria-hidden="true">📄</span>
            <span>Материалы</span>
          </NavLink>
          <NavLink to="/chat" className={({ isActive }) => (isActive ? "active" : "")}>
            <span className="icon" aria-hidden="true">💬</span>
            <span>Чат</span>
          </NavLink>
          <NavLink to="/quiz" className={({ isActive }) => (isActive ? "active" : "")}>
            <span className="icon" aria-hidden="true">📝</span>
            <span>Викторина</span>
          </NavLink>
        </nav>
      </div>
    </DocumentsProvider>
  );
}
