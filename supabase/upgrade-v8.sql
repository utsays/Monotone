-- =====================================================================
-- Upgrade v8 — task comments (discussion thread per task)
-- Run once. Safe to re-run (idempotent).
-- =====================================================================
create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id   uuid references public.tasks(id)   on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  body text not null,
  created_at timestamptz default now()
);
create index if not exists task_comments_task_idx on public.task_comments(task_id);

alter table public.task_comments enable row level security;
drop policy if exists "team all task_comments" on public.task_comments;
create policy "team all task_comments" on public.task_comments
  for all to authenticated using (true) with check (true);

do $$ begin
  alter publication supabase_realtime add table public.task_comments;
exception when duplicate_object then null; end $$;
