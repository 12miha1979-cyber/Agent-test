import express from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { extractText } from "../utils/extract.js";
import { addDocument, listDocuments, removeDocument } from "../storage.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

router.get("/", (req, res) => {
  res.json({ documents: listDocuments() });
});

router.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Файл не был загружен." });
  }

  // multer/busboy decodes multipart filenames as latin1 by default, so a
  // UTF-8 filename (e.g. Cyrillic) arrives mangled — re-decode it correctly.
  req.file.originalname = Buffer.from(req.file.originalname, "latin1").toString("utf8");

  try {
    const text = await extractText(req.file.buffer, req.file.mimetype, req.file.originalname);
    const trimmed = text.trim();

    if (!trimmed) {
      return res.status(422).json({ error: "В этом файле не найден читаемый текст." });
    }

    const doc = addDocument({
      id: uuidv4(),
      name: req.file.originalname,
      size: req.file.size,
      text: trimmed,
      textLength: trimmed.length,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({
      document: { id: doc.id, name: doc.name, size: doc.size, createdAt: doc.createdAt, textLength: doc.textLength },
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(400).json({ error: err.message || "Не удалось обработать файл." });
  }
});

router.delete("/:id", (req, res) => {
  try {
    const removed = removeDocument(req.params.id);
    if (!removed) {
      return res.status(404).json({ error: "Документ не найден." });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: "Не удалось удалить документ." });
  }
});

export default router;
