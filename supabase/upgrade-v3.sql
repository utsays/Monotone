-- ============================================================
--  Agency Dashboard — Operations v3 (members, tags, subtask dates)
--  Run ONCE in Supabase → SQL Editor. Idempotent + migrates data.
-- ============================================================

-- Members ----------------------------------------------------
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  name text not null,
  email text,
  created_at timestamptz default now()
);
create unique index if not exists members_proj_name on public.members(project_id, lower(name));

-- Tags (per-project catalog) ---------------------------------
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz default now()
);
create unique index if not exists tags_proj_name on public.tags(project_id, lower(name));

-- Task assignee -> member ------------------------------------
alter table public.tasks add column if not exists assignee_id uuid;
do $$ begin
  alter table public.tasks add constraint tasks_assignee_fk
    foreign key (assignee_id) references public.members(id) on delete set null;
exception when duplicate_object then null; end $$;

-- Subtask dates ----------------------------------------------
alter table public.subtasks add column if not exists start_date date;
alter table public.subtasks add column if not exists end_date date;

-- RLS + policies ---------------------------------------------
alter table public.members enable row level security;
alter table public.tags    enable row level security;
drop policy if exists "team all members" on public.members;
create policy "team all members" on public.members for all to authenticated using (true) with check (true);
drop policy if exists "team all tags" on public.tags;
create policy "team all tags" on public.tags for all to authenticated using (true) with check (true);

-- Realtime ---------------------------------------------------
do $$ begin alter publication supabase_realtime add table public.members; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.tags;    exception when duplicate_object then null; end $$;

-- Migrate existing data --------------------------------------
-- 1) create members from any assignee text already on tasks
insert into public.members(project_id, name)
select distinct t.project_id, t.assignee
from public.tasks t
where t.assignee is not null and t.assignee <> ''
  and not exists (select 1 from public.members m where m.project_id = t.project_id and lower(m.name) = lower(t.assignee));

-- 2) link tasks to those members
update public.tasks t set assignee_id = m.id
from public.members m
where m.project_id = t.project_id and lower(m.name) = lower(t.assignee)
  and t.assignee is not null and t.assignee_id is null;

-- 3) build the tag catalog from labels already used
insert into public.tags(project_id, name)
select distinct t.project_id, l
from public.tasks t, unnest(t.labels) as l
where not exists (select 1 from public.tags tg where tg.project_id = t.project_id and lower(tg.name) = lower(l));
