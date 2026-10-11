import http from "./http";

export async function fetchDocuments() {
  const { data } = await http.get("/api/documents");
  return data.documents || [];
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await http.post("/api/upload", formData);
  return data;
}

export async function initSessions() {
  const { data } = await http.get("/api/sessions/init");
  return data;
}

export async function fetchSessions() {
  const { data } = await http.get("/api/sessions");
  return data;
}

export async function createSession(title = "新对话") {
  const { data } = await http.post("/api/sessions", { title });
  return data;
}

export async function fetchSessionMessages(sessionId) {
  const { data } = await http.get(`/api/sessions/${sessionId}/messages`);
  return data;
}

export async function deleteSession(sessionId) {
  const { data } = await http.delete(`/api/sessions/${sessionId}`);
  return data;
}

export async function fetchConfig() {
  const { data } = await http.get("/api/config");
  return data;
}

export async function streamChat(question, topK, sessionId, options, callbacks) {
  const { enableWeb = false, model = null } = options || {};
  const resp = await fetch("/api/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      top_k: topK,
      session_id: sessionId,
      enable_web: enableWeb,
      model,
    }),
  });

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.detail || "请求失败");
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data: ")) continue;
      const payload = JSON.parse(line.slice(6));
      callbacks.onEvent?.(payload);
    }
  }
}
