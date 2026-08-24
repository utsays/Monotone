-- ============================================================
--  Agency Dashboard — Operations module (projects & tasks)
--  Run this ONCE in Supabase → SQL Editor → New query → Run.
--  Safe to re-run: it uses "if not exists" / "drop policy if exists".
-- ============================================================

-- Projects ----------------------------------------------------
create table if not exists public.projects (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  color      text default 'slate',
  created_at timestamptz default now(),
  created_by uuid default auth.uid()
);

-- Tasks -------------------------------------------------------
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.projects(id) on delete cascade,
  title       text not null,
  description text,
  status      text not null default 'todo',      -- backlog | todo | doing | done
  priority    text not null default 'medium',    -- low | medium | high
  assignee    text,
  due_date    date,
  position    double precision default extract(epoch from now()),
  created_at  timestamptz default now(),
  created_by  uuid default auth.uid()
);

create index if not exists tasks_project_idx on public.tasks(project_id);

-- Row Level Security -----------------------------------------
alter table public.projects enable row level security;
alter table public.tasks    enable row level security;

-- Any signed-in team member can read & write everything.
drop policy if exists "team all projects" on public.projects;
create policy "team all projects" on public.projects
  for all to authenticated using (true) with check (true);

drop policy if exists "team all tasks" on public.tasks;
create policy "team all tasks" on public.tasks
  for all to authenticated using (true) with check (true);

-- Live updates (Realtime) — guarded so re-running is safe -----
do $$ begin
  alter publication supabase_realtime add table public.projects;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.tasks;
exception when duplicate_object then null; end $$;
