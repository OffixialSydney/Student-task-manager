// app.js
// Main application logic for the Student Task Manager.

Storage.seedIfEmpty();

let editingId = null;
let currentView = "dashboard";

// ---------- Helpers ----------

function todayStr() {
  return new Date().toISOString().slice(0, 10);
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

// ---------- Navigation ----------

function switchView(view) {
  currentView = view;
  document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
  document.getElementById(`view-${view}`).classList.remove("hidden");

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });

  if (view === "dashboard") renderDashboard();
  if (view === "tasks") renderTasks();
  if (view === "add" && !editingId) resetForm();
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

function renderDashboard() {
  const tasks = Storage.getAll();
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

  const recent = [...tasks]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);

  const container = document.getElementById("recent-tasks");
  container.innerHTML = "";
  if (recent.length === 0) {
    container.innerHTML = `<p class="text-sm text-slate-400">No tasks yet. Add your first task!</p>`;
    return;
  }
  recent.forEach((task) => {
    container.appendChild(buildTaskCard(task, { compact: true }));
  });
}

// ---------- Task Card ----------

function buildTaskCard(task, opts = {}) {
  const status = getStatus(task);
  const card = document.createElement("div");
  card.className =
    "bg-white rounded-xl shadow-sm border border-slate-200 p-3 flex flex-col gap-2 cursor-pointer";
  card.dataset.id = task.id;

  card.innerHTML = `
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <p class="font-medium truncate ${task.completed ? "line-through text-slate-400" : ""}">${escapeHtml(task.title)}</p>
        <p class="text-xs text-slate-500 truncate">${escapeHtml(task.subject)} &middot; Due ${formatDate(task.dueDate)}</p>
      </div>
      <div class="flex flex-col items-end gap-1 shrink-0">
        <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full priority-${task.priority}">${task.priority}</span>
        <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full status-${status}">${status}</span>
      </div>
    </div>
    ${
      opts.compact
        ? ""
        : `<div class="flex gap-2 pt-1 text-xs">
            <button class="btn-complete flex-1 border border-emerald-200 text-emerald-700 rounded-lg py-1.5">
              ${task.completed ? "Mark Pending" : "Mark Done"}
            </button>
            <button class="btn-edit flex-1 border border-slate-200 text-slate-600 rounded-lg py-1.5">Edit</button>
            <button class="btn-delete flex-1 border border-rose-200 text-rose-600 rounded-lg py-1.5">Delete</button>
          </div>`
    }
  `;

  card.addEventListener("click", (e) => {
    if (e.target.closest("button")) return;
    openDetails(task.id);
  });

  if (!opts.compact) {
    card.querySelector(".btn-complete").addEventListener("click", (e) => {
      e.stopPropagation();
      Storage.update(task.id, { completed: !task.completed });
      renderTasks();
    });
    card.querySelector(".btn-edit").addEventListener("click", (e) => {
      e.stopPropagation();
      startEdit(task.id);
    });
    card.querySelector(".btn-delete").addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm(`Delete "${task.title}"?`)) {
        Storage.remove(task.id);
        renderTasks();
        renderDashboard();
      }
    });
  }

  return card;
}

// ---------- Tasks list, search & filter ----------

function populateSubjectFilter() {
  const select = document.getElementById("filter-subject");
  const current = select.value;
  const subjects = [...new Set(Storage.getAll().map((t) => t.subject).filter(Boolean))].sort();
  select.innerHTML = `<option value="">All Subjects</option>` +
    subjects.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
  select.value = current;
}

function renderTasks() {
  populateSubjectFilter();

  const search = document.getElementById("search-input").value.trim().toLowerCase();
  const statusFilter = document.getElementById("filter-status").value;
  const priorityFilter = document.getElementById("filter-priority").value;
  const subjectFilter = document.getElementById("filter-subject").value;

  let tasks = Storage.getAll();

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

  const list = document.getElementById("task-list");
  const empty = document.getElementById("empty-state");
  list.innerHTML = "";

  if (tasks.length === 0) {
    empty.classList.remove("hidden");
  } else {
    empty.classList.add("hidden");
    tasks.forEach((task) => list.appendChild(buildTaskCard(task)));
  }
}

["search-input", "filter-status", "filter-priority", "filter-subject"].forEach((id) => {
  document.getElementById(id).addEventListener("input", renderTasks);
  document.getElementById(id).addEventListener("change", renderTasks);
});

// ---------- Task Details Modal ----------

function openDetails(id) {
  const task = Storage.getById(id);
  if (!task) return;
  const status = getStatus(task);

  document.getElementById("details-content").innerHTML = `
    <h3 class="text-lg font-bold mb-1">${escapeHtml(task.title)}</h3>
    <div class="flex gap-2 mb-3">
      <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full priority-${task.priority}">${task.priority} priority</span>
      <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full status-${status}">${status}</span>
    </div>
    <p class="text-sm text-slate-500 mb-1"><strong>Subject:</strong> ${escapeHtml(task.subject)}</p>
    <p class="text-sm text-slate-500 mb-1"><strong>Due:</strong> ${formatDate(task.dueDate)}</p>
    <p class="text-sm text-slate-700 mt-3 whitespace-pre-wrap">${escapeHtml(task.description) || "<span class='text-slate-400'>No description.</span>"}</p>
    <div class="flex gap-2 mt-5">
      <button id="details-edit" class="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm">Edit</button>
      <button id="details-complete" class="flex-1 border border-slate-300 rounded-lg py-2 text-sm">
        ${task.completed ? "Mark Pending" : "Mark Done"}
      </button>
    </div>
  `;

  document.getElementById("details-modal").classList.remove("hidden");

  document.getElementById("details-edit").onclick = () => {
    closeDetails();
    startEdit(task.id);
  };
  document.getElementById("details-complete").onclick = () => {
    Storage.update(task.id, { completed: !task.completed });
    closeDetails();
    renderTasks();
    renderDashboard();
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

function resetForm() {
  editingId = null;
  document.getElementById("form-title").textContent = "Add Task";
  form.reset();
  document.getElementById("f-priority").value = "Medium";
  clearErrors();
}

function startEdit(id) {
  const task = Storage.getById(id);
  if (!task) return;
  editingId = id;
  document.getElementById("form-title").textContent = "Edit Task";
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
  document.querySelectorAll(".error-msg").forEach((e) => e.classList.add("hidden"));
  document.querySelectorAll("#task-form input, #task-form textarea").forEach((el) =>
    el.classList.remove("border-rose-500")
  );
}

function showError(fieldId) {
  const field = document.getElementById(fieldId);
  field.classList.add("border-rose-500");
  document.querySelector(`.error-msg[data-for="${fieldId}"]`)?.classList.remove("hidden");
}

function validateForm() {
  clearErrors();
  let valid = true;
  const title = document.getElementById("f-title").value.trim();
  const subject = document.getElementById("f-subject").value.trim();
  const due = document.getElementById("f-due").value;

  if (!title) {
    showError("f-title");
    valid = false;
  }
  if (!subject) {
    showError("f-subject");
    valid = false;
  }
  if (!due) {
    showError("f-due");
    valid = false;
  }
  return valid;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  const data = {
    title: document.getElementById("f-title").value.trim(),
    description: document.getElementById("f-description").value.trim(),
    subject: document.getElementById("f-subject").value.trim(),
    priority: document.getElementById("f-priority").value,
    dueDate: document.getElementById("f-due").value,
  };

  if (editingId) {
    Storage.update(editingId, data);
  } else {
    Storage.add({
      id: crypto.randomUUID(),
      completed: false,
      createdAt: Date.now(),
      ...data,
    });
  }

  editingId = null;
  resetForm();
  switchView("tasks");
});

document.getElementById("cancel-form-btn").addEventListener("click", () => {
  editingId = null;
  resetForm();
  switchView(currentView === "add" ? "dashboard" : currentView);
});

// ---------- Init ----------

switchView("dashboard");
