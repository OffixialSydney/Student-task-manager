# Student Task Manager

A mobile-first web app for students to create, organize, and track school assignments and tasks.

Built with plain **HTML, CSS (Tailwind via CDN), and JavaScript** — no build step, no backend required. Data is stored locally in the browser (`localStorage`), so it's ready to deploy as a static site today, and easy to extend with a real backend (Node.js + Supabase) later.

## Features (Week 1)

- **Dashboard** — total / completed / pending / overdue counts, overall progress bar, recent tasks
- **Tasks page** — full list with title, description, subject, priority, due date, status
  - Edit, Delete, Mark Complete, View Details on every task
- **Add Task form** — with required-field validation (title, subject, due date)
- **Task Details** — modal view with full task info
- **Search & Filter** — search by keyword, filter by status / priority / subject, with an empty state
- **Responsive, mobile-first design** — bottom tab nav on mobile, adapts up to tablet/desktop

## Project Structure

```
student-task-manager/
├── index.html          # App shell: dashboard, tasks, add/edit form, details modal
├── css/
│   └── styles.css      # Custom styles layered on top of Tailwind
├── js/
│   ├── storage.js       # localStorage persistence layer (Storage API)
│   └── app.js           # Rendering, navigation, CRUD, search/filter, validation
└── README.md
```

## Running Locally

No install needed — just open `index.html` in a browser, or serve it:

```bash
npx serve .
```

## Deploying to Vercel

1. Push this folder to a GitHub repository.
2. Go to [vercel.com](https://vercel.com) → **New Project** → import the repo.
3. Framework preset: **Other** (static site) — no build command needed.
4. Deploy. Vercel will serve `index.html` directly.

## Roadmap / Next Steps

This week's build is intentionally a self-contained static app so it can be pushed and deployed immediately. Planned follow-ups (to be added incrementally):

- Node.js API layer for shared/multi-device data
- Supabase database for persistent, multi-user storage
- Auth (student login)
- Notifications/reminders for upcoming due dates

## Notes on Data

Tasks currently persist in the browser's `localStorage` under the key `stm_tasks_v1`. Clearing browser data will reset tasks. A few sample tasks are seeded automatically the first time the app runs so the dashboard isn't empty.
