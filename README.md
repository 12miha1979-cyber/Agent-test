# AI Study Tutor

A mobile-friendly web app that lets you upload study materials (PDF, DOCX, TXT), chat with an AI tutor about them, and generate quizzes to test your knowledge.

## Structure

- `server/` — Node.js/Express API. Extracts text from uploads and stores it in a local SQLite database, proxies chat/quiz generation to AITUNNEL (an OpenAI-compatible proxy for Claude and other models).
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

Runs on `http://localhost:5173` and talks to the server at `VITE_API_URL` (see `client/.env.example`), which defaults to `http://localhost:3001` if not set. Open it on your phone by visiting `http://<your-computer-ip>:5173` while on the same network (the dev server binds to all interfaces).

## Deploying to separate hosts

The client and server can be deployed to different domains:

- **Server**: set `CORS_ORIGIN` to the client's deployed origin (comma-separate multiple origins if needed). Leave it unset or `*` to allow any origin.
- **Client**: set `VITE_API_URL` at build time to the server's deployed URL (e.g. `https://api.example.com`), then run `npm run build`. This is a build-time variable — rebuild the client if it changes.

## Retrieval-augmented chat and quizzes (RAG)

Every document is tagged with a "Направление" (direction) at upload time — either **Системная семейная терапия** or **КПТ** — and, right after upload, its text is split into overlapping ~550-word chunks (~100-word overlap) and embedded with AITUNNEL's `text-embedding-3-small` model (`server/src/chunking.js`, `server/src/embeddings.js`). Chunks are stored in a separate `chunks` table (`server/src/storage.js`), each carrying its parent document id/name/direction.

Chat and quiz generation no longer send full documents to the model. Instead, the user's question (or quiz topic) is embedded the same way, compared via plain in-memory cosine similarity against stored chunk embeddings — filtered to the selected direction if one is chosen, or across everything for "Все" — and only the top 6-10 matching chunks are sent as context, each labeled with its source filename and direction (`server/src/retrieval.js`). This keeps requests small and answers traceable to a specific source, and scales to hundreds of documents without a vector database.

Deleting a document also deletes its chunks (single transaction in `removeDocument`). If AITUNNEL isn't configured, uploads still succeed and are stored, just without chunks/embeddings (`chunkCount: 0` in the upload response) until re-uploaded once the assistant is available.

## Notes on this first version

- Uploaded documents and their extracted text are stored in a local SQLite database at `server/data/tutor.db` (created automatically on first run) and survive server restarts. Delete a document from the Materials tab to remove it permanently (and its chunks).
- Quizzes are still kept in memory only, keyed by a generated quiz ID, so grading can check answers server-side — they don't need to survive a restart.
- Short-answer quiz grading uses the AI model to compare the student's answer against a model answer; multiple-choice grading is done with a simple string match.
- Chat uses `AITUNNEL_MODEL` (defaults to `claude-sonnet-4.5`) for stronger reasoning; quiz generation and short-answer grading use the cheaper `AITUNNEL_QUIZ_MODEL` (defaults to `deepseek-v4-flash`) since those tasks don't need it. Embeddings use `AITUNNEL_EMBEDDING_MODEL` (defaults to `text-embedding-3-small`).
