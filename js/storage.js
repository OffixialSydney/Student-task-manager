// storage.js
// Handles all persistence of tasks in localStorage.
// Task shape:
// { id, title, description, subject, priority, dueDate, completed, createdAt }

const STORAGE_KEY = "stm_tasks_v1";

const Storage = {
  getAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("Failed to read tasks from storage", e);
      return [];
    }
  },

  saveAll(tasks) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
      console.error("Failed to save tasks to storage", e);
    }
  },

  add(task) {
    const tasks = this.getAll();
    tasks.unshift(task);
    this.saveAll(tasks);
  },

  update(id, updates) {
    const tasks = this.getAll();
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx !== -1) {
      tasks[idx] = { ...tasks[idx], ...updates };
      this.saveAll(tasks);
    }
  },

  remove(id) {
    const tasks = this.getAll().filter((t) => t.id !== id);
    this.saveAll(tasks);
  },

  getById(id) {
    return this.getAll().find((t) => t.id === id);
  },

  seedIfEmpty() {
    if (this.getAll().length === 0) {
      const today = new Date();
      const inDays = (n) => {
        const d = new Date(today);
        d.setDate(d.getDate() + n);
        return d.toISOString().slice(0, 10);
      };
      const sample = [
        {
          id: crypto.randomUUID(),
          title: "Read Chapter 4",
          description: "Read and summarize chapter 4 for discussion.",
          subject: "Biology",
          priority: "Medium",
          dueDate: inDays(3),
          completed: false,
          createdAt: Date.now(),
        },
        {
          id: crypto.randomUUID(),
          title: "Submit Essay Draft",
          description: "First draft of the persuasive essay.",
          subject: "English",
          priority: "High",
          dueDate: inDays(-1),
          completed: false,
          createdAt: Date.now(),
        },
        {
          id: crypto.randomUUID(),
          title: "Problem Set 3",
          description: "Complete problems 1-20.",
          subject: "Mathematics",
          priority: "Low",
          dueDate: inDays(7),
          completed: true,
          createdAt: Date.now(),
        },
      ];
      this.saveAll(sample);
    }
  },
};
