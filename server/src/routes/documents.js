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
    return res.status(400).json({ error: "No file uploaded." });
  }

  try {
    const text = await extractText(req.file.buffer, req.file.mimetype, req.file.originalname);
    const trimmed = text.trim();

    if (!trimmed) {
      return res.status(422).json({ error: "No readable text found in that file." });
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
    res.status(400).json({ error: err.message || "Failed to process file." });
  }
});

router.delete("/:id", (req, res) => {
  const removed = removeDocument(req.params.id);
  if (!removed) {
    return res.status(404).json({ error: "Document not found." });
  }
  res.json({ success: true });
});

export default router;
