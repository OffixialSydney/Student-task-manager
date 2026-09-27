// api.js
// Talks directly to Supabase's built-in REST API using the Supabase JS client
// loaded in index.html. The anon key below is safe to expose in frontend code —
// it only allows whatever your Row Level Security policy permits.

const SUPABASE_URL = "https://atjveqvfolcynlllchcm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0anZlcXZmb2xjeW5sbGxjaGNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4NDI5NDAsImV4cCI6MjEwNTQxODk0MH0.M5ylygwuI2NW3naTdMcrsBqavbRcm8nN6AwCQz9vq1s";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TABLE = "tasks";

// Supabase row (snake_case) -> object the app expects (camelCase)
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

// App object (camelCase) -> Supabase row (snake_case)
function toDb(task) {
  const row = {};
  if (task.title !== undefined) row.title = task.title;
  if (task.description !== undefined) row.description = task.description;
  if (task.subject !== undefined) row.subject = task.subject;
  if (task.priority !== undefined) row.priority = task.priority;
  if (task.dueDate !== undefined) row.due_date = task.dueDate;
  if (task.completed !== undefined) row.completed = task.completed;
  return row;
}

// Same method names as before, so app.js needs zero changes.
const Storage = {
  async getAll() {
    const { data, error } = await client
      .from(TABLE)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data.map(toApi);
  },

  async getById(id) {
    const { data, error } = await client.from(TABLE).select("*").eq("id", id).single();
    if (error) throw new Error(error.message);
    return toApi(data);
  },

  async add(task) {
    const { data, error } = await client.from(TABLE).insert(toDb(task)).select().single();
    if (error) throw new Error(error.message);
    return toApi(data);
  },

  async update(id, updates) {
    const { data, error } = await client
      .from(TABLE)
      .update(toDb(updates))
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toApi(data);
  },

  async remove(id) {
    const { error } = await client.from(TABLE).delete().eq("id", id);
    if (error) throw new Error(error.message);
    return { success: true };
  },
};