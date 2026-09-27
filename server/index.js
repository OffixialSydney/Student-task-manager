import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { supabase } from "./supabaseClient.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const TABLE = "tasks";

// Supabase row (snake_case) -> object the frontend expects (camelCase)
function toApi(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    subject: row.subject,
    priority: row.priority,
    dueDate: row.due_date,
    completed: row.completed,
    createdAt: new Date(row.created_at).getTime(),
  };
}

// Request body (camelCase) -> Supabase row (snake_case), only known fields
function toDb(body) {
  const row = {};
  if (body.title !== undefined) row.title = body.title;
  if (body.description !== undefined) row.description = body.description;
  if (body.subject !== undefined) row.subject = body.subject;
  if (body.priority !== undefined) row.priority = body.priority;
  if (body.dueDate !== undefined) row.due_date = body.dueDate;
  if (body.completed !== undefined) row.completed = body.completed;
  return row;
}

// GET /api/tasks — list every task
app.get("/api/tasks", async (req, res) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(toApi));
});

// GET /api/tasks/:id — one task
app.get("/api/tasks/:id", async (req, res) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", req.params.id)
    .single();
  if (error) return res.status(404).json({ error: "Task not found" });
  res.json(toApi(data));
});

// POST /api/tasks — create a task
app.post("/api/tasks", async (req, res) => {
  const row = toDb(req.body);
  const { data, error } = await supabase
    .from(TABLE)
    .insert(row)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(toApi(data));
});

// PATCH /api/tasks/:id — update part of a task (edit, or toggle completed)
app.patch("/api/tasks/:id", async (req, res) => {
  const row = toDb(req.body);
  const { data, error } = await supabase
    .from(TABLE)
    .update(row)
    .eq("id", req.params.id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(toApi(data));
});

// DELETE /api/tasks/:id — remove a task
app.delete("/api/tasks/:id", async (req, res) => {
  const { error } = await supabase.from(TABLE).delete().eq("id", req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
