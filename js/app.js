// app.js
// Main application logic for the Student Task Manager.
// Backed by Supabase via api.js. This version adds: toast messages instead of
// alert(), a custom delete-confirmation modal instead of confirm(), loading
// states while data is fetched, and disabled buttons while requests are in flight.

let editingId = null;
let currentView = "dashboard";

// ---------- Helpers ----------

function todayStr() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function getStatus(task) {
  if (task.completed) return "completed";
  if (task.dueDate < todayStr()) return "overdue";
  return "pending";
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function subjectColorIndex(subject) {
  const s = subject || "";
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return hash % 6;
}

const ICONS = {
  check: `<svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5L10 17.5L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  undo: `<svg viewBox="0 0 24 24" fill="none"><path d="M7 9L4 12L7 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 12H14.5C17 12 19 14 19 16.5C19 19 17 21 14.5 21H10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" fill="none"><path d="M14.5 5.5L18.5 9.5L8 20H4V16L14.5 5.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none"><path d="M5 7H19M9 7V5C9 4.4 9.4 4 10 4H14C14.6 4 15 4.4 15 5V7M17 7L16.3 19C16.2 19.6 15.7 20 15.1 20H8.9C8.3 20 7.8 19.6 7.7 19L7 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

function loadingBlock(message) {
  return `<div class="loading-block"><div class="spinner"></div><p>${message}</p></div>`;
}

// ---------- Toast ----------

let toastTimer = null;

function showToast(message, type = "error") {
  const toast = document.getElementById("toast");
  document.getElementById("toast-message").textContent = message;
  toast.dataset.type = type;
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 3500);
}

function handleError(err) {
  console.error(err);
  showToast(err.message || "Something went wrong. Check your connection and try again.", "error");
}

// ---------- Custom confirm dialog (replaces browser confirm()) ----------

function showConfirm(title, message) {
  const modal = document.getElementById("confirm-modal");
  document.getElementById("confirm-title").textContent = title;
  document.getElementById("confirm-message").textContent = message;
  modal.classList.remove("hidden");

  return new Promise((resolve) => {
    const cleanup = (result) => {
      modal.classList.add("hidden");
      okBtn.removeEventListener("click", onOk);
      cancelBtn.removeEventListener("click", onCancel);
      modal.removeEventListener("click", onOverlay);
      resolve(result);
    };
    const okBtn = document.getElementById("confirm-ok");
    const cancelBtn = document.getElementById("confirm-cancel");
    const onOk = () => cleanup(true);
    const onCancel = () => cleanup(false);
    const onOverlay = (e) => {
      if (e.target === modal) cleanup(false);
    };
    okBtn.addEventListener("click", onOk);
    cancelBtn.addEventListener("click", onCancel);
    modal.addEventListener("click", onOverlay);
  });
}

// ---------- Due-date alerts ----------

const DAY_MS = 24 * 60 * 60 * 1000;
const DISMISS_KEY = "stm_alerts_dismissed";
const NOTIFIED_KEY = "stm_notified";

// Whole days from today until the due date (negative = overdue).
function daysUntil(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const due = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((due - today) / DAY_MS);
}

function alertLabel(days) {
  if (days < 0) return days === -1 ? "Overdue by 1 day" : `Overdue by ${-days} days`;
  if (days === 0) return "Due today";
  return "Due tomorrow";
}

function alertTone(days) {
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  return "soon";
}

// Unfinished tasks that are overdue, due today, or due tomorrow.
function getUrgentTasks(tasks) {
  return tasks
    .filter((t) => !t.completed && daysUntil(t.dueDate) <= 1)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

function notificationsSupported() {
  return "Notification" in window;
}

async function enableNotifications() {
  if (!notificationsSupported()) {
    showToast("This browser doesn't support notifications.", "error");
    return;
  }
  const result = await Notification.requestPermission();
  if (result === "granted") {
    showToast("Notifications turned on", "success");
    refreshAlerts();
  } else {
    showToast("Notifications were not allowed.", "error");
  }
}

// Pops a browser notification once per task per day (overdue + due today only).
function fireDueNotifications(urgent) {
  if (!notificationsSupported() || Notification.permission !== "granted") return;

  let seen = {};
  try {
    seen = JSON.parse(localStorage.getItem(NOTIFIED_KEY) || "{}");
  } catch (e) {
    seen = {};
  }

  const today = todayStr();
  Object.keys(seen).forEach((k) => {
    if (!k.endsWith(`:${today}`)) delete seen[k];
  });

  urgent.forEach((t) => {
    const days = daysUntil(t.dueDate);
    if (days > 0) return;
    const key = `${t.id}:${today}`;
    if (seen[key]) return;
    seen[key] = true;
    try {
      new Notification(`${alertLabel(days)}: ${t.title}`, { body: t.subject });
    } catch (e) {
      // Some mobile browsers don't allow this; the in-app panel still works.
    }
  });

  try {
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify(seen));
  } catch (e) {}
}

function updateDueAlerts(tasks) {
  const panel = document.getElementById("due-alerts");
  const urgent = getUrgentTasks(tasks);

  fireDueNotifications(urgent);

  const signature = urgent.map((t) => t.id).join(",");
  let dismissed = null;
  try {
    dismissed = sessionStorage.getItem(DISMISS_KEY);
  } catch (e) {}

  if (urgent.length === 0 || dismissed === signature) {
    panel.classList.add("hidden");
    return;
  }

  const shown = urgent.slice(0, 5);
  const extra = urgent.length - shown.length;
  const worst = Math.min(...urgent.map((t) => daysUntil(t.dueDate)));
  const canAskPermission = notificationsSupported() && Notification.permission === "default";

  panel.dataset.tone = alertTone(worst);
  panel.innerHTML = `
    <div class="alert-head">
      <p class="alert-title">Needs your attention (${urgent.length})</p>
      <button class="alert-dismiss" aria-label="Dismiss alerts">&times;</button>
    </div>
    ${shown
      .map((t) => {
        const days = daysUntil(t.dueDate);
        return `
        <button class="alert-row" data-id="${t.id}">
          <div class="alert-row-main">
            <p class="alert-row-title">${escapeHtml(t.title)}</p>
            <p class="alert-row-sub">${escapeHtml(t.subject)}</p>
          </div>
          <span class="alert-tag alert-tag-${alertTone(days)}">${alertLabel(days)}</span>
        </button>`;
      })
      .join("")}
    ${extra > 0 ? `<p class="alert-more">+${extra} more — see the Tasks page</p>` : ""}
    ${canAskPermission ? `<button class="alert-notify">Turn on notifications</button>` : ""}
  `;
  panel.classList.remove("hidden");

  panel.querySelector(".alert-dismiss").addEventListener("click", () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, signature);
    } catch (e) {}
    panel.classList.add("hidden");
  });
  panel.querySelectorAll(".alert-row").forEach((row) => {
    row.addEventListener("click", () => openDetails(row.dataset.id));
  });
  const notifyBtn = panel.querySelector(".alert-notify");
  if (notifyBtn) notifyBtn.addEventListener("click", enableNotifications);
}

// Re-fetches tasks and refreshes the alerts (used by the timer and tab refocus).
async function refreshAlerts() {
  try {
    const tasks = await Storage.getAll();
    updateDueAlerts(tasks);
  } catch (err) {
    console.error(err);
  }
}

setInterval(refreshAlerts, 5 * 60 * 1000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refreshAlerts();
});

// ---------- Navigation ----------

async function switchView(view) {
  currentView = view;
  document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
  document.getElementById(`view-${view}`).classList.remove("hidden");

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });

  try {
    if (view === "dashboard") await renderDashboard();
    if (view === "tasks") await renderTasks();
    if (view === "add" && !editingId) resetForm();
  } catch (err) {
    handleError(err);
  }
}

document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});

document.getElementById("addTaskTopBtn").addEventListener("click", () => {
  editingId = null;
  resetForm();
  switchView("add");
});

// ---------- Dashboard ----------

async function renderDashboard() {
  const container = document.getElementById("recent-tasks");
  container.innerHTML = loadingBlock("Loading dashboard…");

  const tasks = await Storage.getAll();
  updateDueAlerts(tasks);
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const overdue = tasks.filter((t) => getStatus(t) === "overdue").length;
  const pending = total - completed - overdue;
  const progress = total ? Math.round((completed / total) * 100) : 0;

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-completed").textContent = completed;
  document.getElementById("stat-pending").textContent = pending;
  document.getElementById("stat-overdue").textContent = overdue;
  document.getElementById("progress-bar").style.width = `${progress}%`;
  document.getElementById("progress-label").textContent = `${progress}%`;

  const recent = [...tasks].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);

  container.innerHTML = "";

  if (recent.length === 0) {
    container.innerHTML = `<p class="recent-empty">No tasks yet — add your first one.</p>`;
    return;
  }

  recent.forEach((task) => {
    const status = getStatus(task);
    const row = document.createElement("div");
    row.className = "recent-row";
    row.innerHTML = `
      <div class="recent-main">
        <p class="recent-title ${task.completed ? "is-done" : ""}">${escapeHtml(task.title)}</p>
        <p class="recent-meta">
          <span class="subject-dot subject-${subjectColorIndex(task.subject)}"></span>${escapeHtml(task.subject)} &middot; Due ${formatDate(task.dueDate)}
        </p>
      </div>
      <span class="badge status-${status}">${status}</span>
    `;
    row.addEventListener("click", () => openDetails(task.id));
    container.appendChild(row);
  });
}

// ---------- Task Card ----------

const TAB_COLORS = ["var(--blue)", "var(--green)", "var(--gold)", "var(--red)", "#7c5cbf", "#2a8c82"];

function buildTaskCard(task) {
  const status = getStatus(task);
  const colorIdx = subjectColorIndex(task.subject);

  const card = document.createElement("div");
  card.className = "task-card";
  card.dataset.id = task.id;

  card.innerHTML = `
    <div class="task-card-tab" style="background:${TAB_COLORS[colorIdx]}"></div>
    <div class="task-card-body">
      <div class="task-card-top">
        <div class="min-w-0">
          <p class="task-title ${task.completed ? "is-done" : ""}">${escapeHtml(task.title)}</p>
          <p class="task-meta">
            <span class="subject-dot subject-${colorIdx}"></span>${escapeHtml(task.subject)} &middot; Due <span class="due-mono">${formatDate(task.dueDate)}</span>
          </p>
        </div>
        <div class="badge-row">
          <span class="badge priority-${task.priority}">${task.priority}</span>
          <span class="badge status-${status}">${status}</span>
        </div>
      </div>
      <div class="task-actions">
        <button class="action-btn action-complete">${task.completed ? ICONS.undo : ICONS.check}${task.completed ? "Reopen" : "Done"}</button>
        <button class="action-btn action-edit">${ICONS.edit}Edit</button>
        <button class="action-btn action-delete">${ICONS.trash}Delete</button>
      </div>
    </div>
  `;

  card.addEventListener("click", (e) => {
    if (e.target.closest("button")) return;
    openDetails(task.id);
  });

  card.querySelector(".action-complete").addEventListener("click", async (e) => {
    e.stopPropagation();
    try {
      await Storage.update(task.id, { completed: !task.completed });
      await renderTasks();
      showToast(task.completed ? "Task reopened" : "Task marked done", "success");
    } catch (err) {
      handleError(err);
    }
  });
  card.querySelector(".action-edit").addEventListener("click", (e) => {
    e.stopPropagation();
    startEdit(task.id);
  });
  card.querySelector(".action-delete").addEventListener("click", async (e) => {
    e.stopPropagation();
    const ok = await showConfirm("Delete task", `Delete "${task.title}"? This can't be undone.`);
    if (!ok) return;
    try {
      await Storage.remove(task.id);
      await renderTasks();
      await renderDashboard();
      showToast("Task deleted", "success");
    } catch (err) {
      handleError(err);
    }
  });

  return card;
}

// ---------- Tasks list, search & filter ----------

async function populateSubjectFilter(tasks) {
  const select = document.getElementById("filter-subject");
  const current = select.value;
  const subjects = [...new Set(tasks.map((t) => t.subject).filter(Boolean))].sort();
  select.innerHTML = `<option value="">Any subject</option>` +
    subjects.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
  select.value = current;
}

async function renderTasks() {
  const list = document.getElementById("task-list");
  const empty = document.getElementById("empty-state");
  empty.classList.add("hidden");
  list.innerHTML = loadingBlock("Loading tasks…");

  const allTasks = await Storage.getAll();
  updateDueAlerts(allTasks);
  await populateSubjectFilter(allTasks);

  const search = document.getElementById("search-input").value.trim().toLowerCase();
  const statusFilter = document.getElementById("filter-status").value;
  const priorityFilter = document.getElementById("filter-priority").value;
  const subjectFilter = document.getElementById("filter-subject").value;

  let tasks = allTasks;

  if (search) {
    tasks = tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(search) ||
        (t.description || "").toLowerCase().includes(search)
    );
  }
  if (statusFilter) tasks = tasks.filter((t) => getStatus(t) === statusFilter);
  if (priorityFilter) tasks = tasks.filter((t) => t.priority === priorityFilter);
  if (subjectFilter) tasks = tasks.filter((t) => t.subject === subjectFilter);

  tasks.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  list.innerHTML = "";

  if (tasks.length === 0) {
    empty.classList.remove("hidden");
  } else {
    empty.classList.add("hidden");
    tasks.forEach((task) => list.appendChild(buildTaskCard(task)));
  }
}

["search-input", "filter-status", "filter-priority", "filter-subject"].forEach((id) => {
  document.getElementById(id).addEventListener("input", () => renderTasks().catch(handleError));
  document.getElementById(id).addEventListener("change", () => renderTasks().catch(handleError));
});

// ---------- Task Details Modal ----------

async function openDetails(id) {
  let task;
  try {
    task = await Storage.getById(id);
  } catch (err) {
    return handleError(err);
  }
  const status = getStatus(task);

  document.getElementById("details-content").innerHTML = `
    <h3 class="details-title">${escapeHtml(task.title)}</h3>
    <div class="details-badges">
      <span class="badge priority-${task.priority}">${task.priority} priority</span>
      <span class="badge status-${status}">${status}</span>
    </div>
    <p class="details-row"><strong>Subject:</strong> ${escapeHtml(task.subject)}</p>
    <p class="details-row"><strong>Due:</strong> ${formatDate(task.dueDate)}</p>
    <p class="details-desc">${escapeHtml(task.description) || "No description."}</p>
    <div class="details-actions">
      <button id="details-edit" class="btn-primary btn-block">Edit</button>
      <button id="details-complete" class="btn-secondary btn-block">${task.completed ? "Mark pending" : "Mark done"}</button>
    </div>
  `;

  document.getElementById("details-modal").classList.remove("hidden");

  document.getElementById("details-edit").onclick = () => {
    closeDetails();
    startEdit(task.id);
  };
  document.getElementById("details-complete").onclick = async () => {
    try {
      await Storage.update(task.id, { completed: !task.completed });
      closeDetails();
      await renderTasks();
      await renderDashboard();
    } catch (err) {
      handleError(err);
    }
  };
}

function closeDetails() {
  document.getElementById("details-modal").classList.add("hidden");
}

document.getElementById("close-details").addEventListener("click", closeDetails);
document.getElementById("details-modal").addEventListener("click", (e) => {
  if (e.target.id === "details-modal") closeDetails();
});

// ---------- Add / Edit Form ----------

const form = document.getElementById("task-form");
const saveBtn = form.querySelector('button[type="submit"]');

function resetForm() {
  editingId = null;
  document.getElementById("form-title").textContent = "Add task";
  form.reset();
  document.getElementById("f-priority").value = "Medium";
  clearErrors();
}

async function startEdit(id) {
  let task;
  try {
    task = await Storage.getById(id);
  } catch (err) {
    return handleError(err);
  }
  editingId = id;
  document.getElementById("form-title").textContent = "Edit task";
  document.getElementById("task-id").value = task.id;
  document.getElementById("f-title").value = task.title;
  document.getElementById("f-description").value = task.description || "";
  document.getElementById("f-subject").value = task.subject;
  document.getElementById("f-priority").value = task.priority;
  document.getElementById("f-due").value = task.dueDate;
  clearErrors();
  switchView("add");
}

function clearErrors() {
  document.querySelectorAll(".field-error").forEach((e) => e.classList.remove("show"));
  document.querySelectorAll("#task-form .field-input").forEach((el) =>
    el.classList.remove("has-error")
  );
}

function showError(fieldId) {
  document.getElementById(fieldId).classList.add("has-error");
  document.querySelector(`.field-error[data-for="${fieldId}"]`)?.classList.add("show");
}

function validateForm() {
  clearErrors();
  let valid = true;
  const title = document.getElementById("f-title").value.trim();
  const subject = document.getElementById("f-subject").value.trim();
  const due = document.getElementById("f-due").value;

  if (!title) { showError("f-title"); valid = false; }
  if (!subject) { showError("f-subject"); valid = false; }
  if (!due) { showError("f-due"); valid = false; }
  return valid;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  const data = {
    title: document.getElementById("f-title").value.trim(),
    description: document.getElementById("f-description").value.trim(),
    subject: document.getElementById("f-subject").value.trim(),
    priority: document.getElementById("f-priority").value,
    dueDate: document.getElementById("f-due").value,
  };

  const wasEditing = !!editingId;
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving…";

  try {
    if (editingId) {
      await Storage.update(editingId, data);
    } else {
      await Storage.add(data);
    }
    editingId = null;
    resetForm();
    await switchView("tasks");
    showToast(wasEditing ? "Task updated" : "Task added", "success");
  } catch (err) {
    handleError(err);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save task";
  }
});

document.getElementById("cancel-form-btn").addEventListener("click", () => {
  editingId = null;
  resetForm();
  switchView(currentView === "add" ? "dashboard" : currentView);
});

// ---------- Init ----------

switchView("dashboard");