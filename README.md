# Coursework — Student Task Manager

A mobile-first web app that helps students create, organize, and track school assignments and other tasks.

## Project Description

Coursework lets a student keep every assignment in one place. Tasks have a title, description, course/subject, priority, and due date. The dashboard shows how things stand at a glance, and an alert panel highlights anything overdue, due today, or due tomorrow. The app was designed mobile-first and built entirely on a phone.

## Live Link

https://YOUR-PROJECT.vercel.app

## GitHub Repository

https://github.com/YOUR-USERNAME/student-task-manager

## Features

- **Dashboard**: total, completed, pending, and overdue counts, an overall progress bar, and recent tasks
- **Due-date alerts**: a "Needs your attention" panel for overdue, due-today, and due-tomorrow tasks, re-checked every 5 minutes and whenever the tab regains focus; optional browser notifications where the browser supports them
- **Tasks page**: every task shown as a card with title, subject, priority, due date, and status
- **Full CRUD**: create, view, edit, delete, and mark tasks as completed
- **Task details**: tap any task to see its complete information
- **Add/Edit form** with validation for the required fields (title, subject, due date)
- **Search and filters**: search by title or description; filter by status, priority, and subject; all combinable
- **Polished UX**: loading spinners, toast messages for success and errors, a custom delete confirmation, disabled buttons while saving, and an empty state when nothing matches
- **Responsive**: bottom tab bar on mobile, top navigation on tablet and desktop

## Technologies Used

| Area | Tools |
| --- | --- |
| Frontend | HTML5, CSS3 (custom properties, Grid, Flexbox), vanilla JavaScript (ES6+, async/await) |
| Database | Supabase (PostgreSQL) with Row Level Security |
| API | Supabase's built-in REST API (PostgREST), accessed through `supabase-js` |
| Fonts | Fraunces, Inter, IBM Plex Mono (Google Fonts) |
| Hosting | Vercel |
| Version control | Git and GitHub |

## Project Structure

```
student-task-manager/
├── index.html        # App shell: dashboard, tasks, add/edit form, modals
├── css/
│   ├── styles.css    # Design system and components
│   └── alerts.css    # Due-date alert panel
├── js/
│   ├── api.js        # Supabase connection and data functions
│   └── app.js        # Rendering, navigation, search/filter, validation, alerts
└── README.md
```

## Database Schema

```sql
create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  subject text not null,
  priority text not null default 'Medium',
  due_date date not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table tasks enable row level security;

create policy "Allow all access to tasks (no auth yet)"
on tasks for all using (true) with check (true);
```

## Running It Yourself

1. Create a Supabase project and run the SQL above in the SQL Editor.
2. In `js/api.js`, set `SUPABASE_URL` and `SUPABASE_ANON_KEY` to your project's values (Project Settings, then API). Use the `anon` public key, never the `service_role` key.
3. Open `index.html` in a browser, or serve the folder with `npx serve .`.
4. To deploy, push to GitHub and import the repo into Vercel. No build step is needed.

## How I Built It

The project was built over seven days, entirely on a phone, with AI assistance (Claude) for code generation and debugging:

| Day | Focus |
| --- | --- |
| 1 | Project structure, navbar, dashboard, tasks page, and responsive layout |
| 2 | Add Task form, validation, task cards and list |
| 3 | Full CRUD: create, read, update, delete, mark complete |
| 4 | Search and filters by status, priority, and subject |
| 5 | Moved storage from `localStorage` to a Supabase database |
| 6 | UI polish: loading states, toasts, delete confirmation, buttons and spacing |
| 7 | Due-date alerts, deployment to Vercel, and this documentation |

## Challenges I Faced

- **Building on a phone.** Editing multiple files, copying code, and committing from a mobile screen was slower and more error-prone than on a laptop.
- **A backend I didn't need.** I first built a Node/Express API, then found Supabase already provides GET, POST, PATCH, and DELETE endpoints for every table. I removed the server, which made the app simpler and cheaper to host.
- **`localhost` on a phone.** The first deployed version failed with "Load failed" because the app was still calling `localhost`, which on a phone means the phone itself.
- **Row Level Security.** Adding a task failed with "new row violates row-level security policy" until I created an access policy for the table.
- **A wrong Supabase URL.** A single mistyped project URL caused confusing errors. Re-checking the exact values in Project Settings fixed it.
- **Vercel's login wall.** Vercel's default Deployment Protection blocked the live site for anyone without a Vercel account. Turning it off made the link public.
- **Overwritten CSS.** Pasting a new block over `styles.css` instead of appending it left the deployed site unstyled. Comparing the deployed file with my source showed what happened.
- **Git out of sync.** The GitHub mobile editor refused to commit because my local branch was behind; pulling the latest changes first fixed it.
- **Time zones.** Using UTC dates for "overdue" checks could be off by a day near midnight, so the date logic now uses the user's local date.

## What I Learned

- How a frontend, an API, and a database fit together, and how much a managed service like Supabase does for you
- How Row Level Security controls who can read and write data, and why the `anon` key is safe in the browser but the `service_role` key is not
- Working with `async`/`await`, loading states, and error handling for real network requests
- Deploying a static site with Vercel and debugging production problems that don't appear locally
- Designing mobile-first with a consistent design system (color tokens, type scale, spacing)
- Reading error messages carefully; most of the bugs above were solved by understanding exactly what the message said

## Future Improvements

- **User accounts** with Supabase Auth, and per-user policies so each student sees only their own tasks (right now the table is shared and has no login)
- **Push notifications** using a service worker and a scheduled Supabase Edge Function, so reminders arrive even when the app is closed
- Installable **PWA** support with offline access
- Calendar view and sorting options
- Custom subject colors and subtasks
- Dark mode
- Automated tests for the date and filter logic
