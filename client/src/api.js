const BASE = "/api";

async function handle(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Ошибка запроса (${res.status})`);
  }
  return data;
}

export function getHealth() {
  return fetch(`${BASE}/health`).then(handle);
}

export function listDocuments() {
  return fetch(`${BASE}/documents`).then(handle);
}

export function uploadDocument(file, onProgress) {
  const formData = new FormData();
  formData.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE}/documents/upload`);

    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      let data = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // ignore parse errors, handled below
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
      } else {
        reject(new Error(data.error || `Ошибка загрузки (${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error("Сетевая ошибка при загрузке файла."));
    xhr.send(formData);
  });
}

export function deleteDocument(id) {
  return fetch(`${BASE}/documents/${id}`, { method: "DELETE" }).then(handle);
}

export function sendChatMessage({ message, documentIds, history, model }) {
  return fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, documentIds, history, model }),
  }).then(handle);
}

export function generateQuiz({ documentIds, numQuestions, model }) {
  return fetch(`${BASE}/quiz/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentIds, numQuestions, model }),
  }).then(handle);
}

export function gradeQuiz({ quizId, answers }) {
  return fetch(`${BASE}/quiz/grade`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quizId, answers }),
  }).then(handle);
}
