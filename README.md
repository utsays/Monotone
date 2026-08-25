# Agency Dashboard (Monotone)

A custom, cloud-hosted project-management dashboard for a small agency — built with
**Next.js 16 + React 19**, **Supabase** (auth, Postgres, realtime), and deployed on **Vercel**.

Live: https://monotone-dashboard.vercel.app

## Modules

- **Board** — Trello/Asana-style Kanban: projects, custom sections, drag-and-drop
  (cards + sections), editable tags, project members, assignees, states, start/end
  dates, locked estimates, and subtasks with their own dates. Live-synced between
  teammates via Supabase realtime.
- **Projects** — portfolio overview with progress and metrics per project.
- **Calendar** — every task laid out by date, synced with the board.
- **Overview** — top-level snapshot (sample metrics + charts).
- **Finance / CRM / Strategy** — scaffolded, coming next.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
```

Create `.env.local` (see `.env.local.example`) with your Supabase keys. Without them
the app runs in a local **preview mode**.

## Database

Run the SQL in `supabase/` against your Supabase project (SQL Editor):
`schema.sql` → `upgrade.sql` → `upgrade-v3.sql` (each is idempotent).

## Deploy

Pushes to `main` deploy automatically via the connected Vercel project.
