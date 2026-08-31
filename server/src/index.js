import "dotenv/config";
import express from "express";
import cors from "cors";
import documentsRouter from "./routes/documents.js";
import chatRouter from "./routes/chat.js";
import quizRouter from "./routes/quiz.js";
import { isConfigured } from "./ai.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", assistantConfigured: isConfigured() });
});

app.use("/api/documents", documentsRouter);
app.use("/api/chat", chatRouter);
app.use("/api/quiz", quizRouter);

app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "Файл слишком большой (максимум 20 МБ)." });
  }
  res.status(500).json({ error: "На сервере произошла ошибка." });
});

app.listen(PORT, () => {
  console.log(`AI Tutor server listening on port ${PORT}`);
  if (!isConfigured()) {
    console.warn("Warning: AITUNNEL_API_KEY is not set. Chat and quiz features will be disabled.");
  }
});
