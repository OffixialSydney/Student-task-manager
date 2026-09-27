// api.js
// Talks to the backend REST API (server/index.js) instead of localStorage.
// Change API_BASE once your server is deployed (e.g. your Render/Railway URL).

const API_BASE = "http://localhost:4000/api";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

// Same method names as the old localStorage version, kept as "Storage"
// so nothing else needs renaming — but every method now returns a Promise.
const Storage = {
  getAll() {
    return request("/tasks");
  },
  getById(id) {
    return request(`/tasks/${id}`);
  },
  add(task) {
    // The server assigns id, completed, and createdAt — just send the form fields.
    return request("/tasks", {
      method: "POST",
      body: JSON.stringify(task),
    });
  },
  update(id, updates) {
    return request(`/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  },
  remove(id) {
    return request(`/tasks/${id}`, { method: "DELETE" });
  },
};
