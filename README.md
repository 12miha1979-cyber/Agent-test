# AI Study Tutor

A mobile-friendly web app that lets you upload study materials (PDF, DOCX, TXT), chat with an AI tutor about them, and generate quizzes to test your knowledge.

## Structure

- `server/` — Node.js/Express API. Extracts text from uploads and stores it in memory, proxies chat/quiz generation to AITUNNEL (an OpenAI-compatible proxy for Claude and other models).
- `client/` — React (Vite) frontend with three tabs: Materials, Chat, Quiz Me.

## Setup

### 1. Server

```bash
cd server
npm install
cp .env.example .env   # then set AITUNNEL_API_KEY
npm run dev
```

Runs on `http://localhost:3001`. Without `AITUNNEL_API_KEY` set, uploads still work but Chat and Quiz Me will return a friendly "not configured" error.

### 2. Client

```bash
cd client
npm install
npm run dev
```

Runs on `http://localhost:5173` and proxies `/api` calls to the server. Open it on your phone by visiting `http://<your-computer-ip>:5173` while on the same network (the dev server binds to all interfaces).

## Notes on this first version

- Uploaded documents and their extracted text live **in memory only** — restarting the server clears everything. No database yet.
- Quizzes are also kept in memory, keyed by a generated quiz ID, so grading can check answers server-side.
- Short-answer quiz grading uses the AI model to compare the student's answer against a model answer; multiple-choice grading is done with a simple string match.
