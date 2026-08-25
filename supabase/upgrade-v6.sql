-- =====================================================================
-- Upgrade v6 — multiple assignees per task
-- Run once in the Supabase SQL editor. Safe to re-run (idempotent).
-- =====================================================================
create table if not exists public.task_assignees (
  task_id   uuid references public.tasks(id)   on delete cascade,
  member_id uuid references public.members(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (task_id, member_id)
);

alter table public.task_assignees enable row level security;
drop policy if exists "team all task_assignees" on public.task_assignees;
create policy "team all task_assignees" on public.task_assignees
  for all to authenticated using (true) with check (true);

do $$ begin
  alter publication supabase_realtime add table public.task_assignees;
exception when duplicate_object then null; end $$;

-- Backfill from the existing single assignee so nothing is lost.
insert into public.task_assignees (task_id, member_id)
select id, assignee_id from public.tasks where assignee_id is not null
on conflict do nothing;
