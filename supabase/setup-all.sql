-- ============================================================
--  Agency Dashboard — COMPLETE setup (run once, idempotent)
--  Safe to run even if you've run earlier scripts. Brings the
--  database fully up to date and seeds the "Agency Launch" board.
--  Supabase → SQL Editor → New query → paste → Run.
-- ============================================================

-- ---- base tables ----
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text default 'slate',
  archived boolean not null default false,
  created_at timestamptz default now(),
  created_by uuid default auth.uid()
);
alter table public.projects add column if not exists archived boolean not null default false;
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  title text not null, description text,
  status text not null default 'todo',
  priority text not null default 'medium',
  assignee text, due_date date,
  position double precision default extract(epoch from now()),
  created_at timestamptz default now(),
  created_by uuid default auth.uid()
);

-- ---- task columns (sections/dates/state/labels/assignee) ----
alter table public.tasks add column if not exists section_id uuid;
alter table public.tasks add column if not exists start_date date;
alter table public.tasks add column if not exists end_date date;
alter table public.tasks add column if not exists estimate numeric;
alter table public.tasks add column if not exists state text default 'not_started';
alter table public.tasks add column if not exists labels text[] default '{}';
alter table public.tasks add column if not exists assignee_id uuid;

-- ---- sections ----
create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  name text not null, position double precision default 0,
  created_at timestamptz default now()
);
do $$ begin alter table public.tasks add constraint tasks_section_fk
  foreign key (section_id) references public.sections(id) on delete set null;
exception when duplicate_object then null; end $$;

-- ---- subtasks (with dates) ----
create table if not exists public.subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade,
  title text not null, done boolean default false,
  position double precision default extract(epoch from now()),
  created_at timestamptz default now()
);
alter table public.subtasks add column if not exists start_date date;
alter table public.subtasks add column if not exists end_date date;

-- ---- members ----
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  name text not null, email text, created_at timestamptz default now()
);
create unique index if not exists members_proj_name on public.members(project_id, lower(name));
do $$ begin alter table public.tasks add constraint tasks_assignee_fk
  foreign key (assignee_id) references public.members(id) on delete set null;
exception when duplicate_object then null; end $$;

-- ---- tags ----
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  name text not null, color text, created_at timestamptz default now()
);
create unique index if not exists tags_proj_name on public.tags(project_id, lower(name));

create table if not exists public.task_assignees (
  task_id   uuid references public.tasks(id)   on delete cascade,
  member_id uuid references public.members(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (task_id, member_id)
);

create index if not exists tasks_project_idx  on public.tasks(project_id);
create index if not exists tasks_section_idx  on public.tasks(section_id);
create index if not exists sections_project_idx on public.sections(project_id);
create index if not exists subtasks_task_idx   on public.subtasks(task_id);

-- ---- RLS + policies (any signed-in team member) ----
alter table public.projects enable row level security;
alter table public.tasks    enable row level security;
alter table public.sections enable row level security;
alter table public.subtasks enable row level security;
alter table public.members  enable row level security;
alter table public.tags     enable row level security;
alter table public.task_assignees enable row level security;
do $$
declare t text;
begin
  foreach t in array array['projects','tasks','sections','subtasks','members','tags','task_assignees'] loop
    execute format('drop policy if exists "team all %1$s" on public.%1$I', t);
    execute format('create policy "team all %1$s" on public.%1$I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- ---- realtime ----
do $$ declare t text;
begin
  foreach t in array array['projects','tasks','sections','subtasks','members','tags','task_assignees'] loop
    begin execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null; end;
  end loop;
end $$;

-- ---- seed "Agency Launch" (only if absent) ----
do $$
declare pid uuid; s00 uuid; s01 uuid; s02 uuid; s03 uuid; s04 uuid; s05 uuid; s06 uuid; s07 uuid;
begin
  if exists (select 1 from public.projects where name = 'Agency Launch') then return; end if;
  insert into public.projects(name) values ('Agency Launch') returning id into pid;
  insert into public.sections(project_id,name,position) values (pid,'00 · Foundation',0) returning id into s00;
  insert into public.sections(project_id,name,position) values (pid,'01 · Skills and Research',1) returning id into s01;
  insert into public.sections(project_id,name,position) values (pid,'02 · Website Build',2) returning id into s02;
  insert into public.sections(project_id,name,position) values (pid,'03 · Presence and Proof',3) returning id into s03;
  insert into public.sections(project_id,name,position) values (pid,'04 · Sales System',4) returning id into s04;
  insert into public.sections(project_id,name,position) values (pid,'05 · Outreach Live',5) returning id into s05;
  insert into public.sections(project_id,name,position) values (pid,'Always On',6) returning id into s06;
  insert into public.sections(project_id,name,position) values (pid,'Parked',7) returning id into s07;
  insert into public.tasks(project_id,section_id,title,labels,estimate,state,assignee,start_date,end_date,position) values
  (pid,s00,'Finalize Offer',array['Offer','Make'],1.0,'done','H6','2026-08-17','2026-08-17',1),
  (pid,s01,'Content & copywriting',array['Content','Learn'],1.0,'done','UT','2026-08-17','2026-08-22',1),
  (pid,s01,'Research agency websites & positioning',array['Content','Learn'],0.5,'in_progress','UT','2026-08-20','2026-08-20',2),
  (pid,s01,'Learn website wireframing basics',array['Content','Learn'],0.5,'not_started','UT','2026-08-20','2026-08-20',3),
  (pid,s02,'Write website content',array['Content','Make'],2.0,'not_started','UT','2026-08-23','2026-08-23',1),
  (pid,s02,'Monotone Design Inspiration',array['Website','Research'],1.0,'not_started','UT','2026-08-24','2026-08-24',2),
  (pid,s02,'Wireframe the pages',array['Website','Make'],1.0,'not_started','UT','2026-08-25','2026-08-25',3),
  (pid,s02,'Set up domain, hosting, business email, analytics',array['Website','Make'],0.5,'done','Ha','2026-08-25','2026-08-25',4),
  (pid,s02,'Website development',array['Website','Make'],4.0,'not_started','Ha','2026-08-26','2026-08-29',5),
  (pid,s02,'Website final testing',array['Website','Make'],1.0,'not_started','UT','2026-08-29','2026-08-29',6),
  (pid,s02,'Website live',array['Website','Make'],0.5,'not_started','Ha','2026-08-30','2026-08-30',7),
  (pid,s02,'SEO & content marketing (Saad''s live + SEO course)',array['Content','Learn'],2.0,'waiting','UT','2026-08-28','2026-08-31',8),
  (pid,s02,'SEO research for website content',array['Content','Learn'],1.0,'not_started','UT','2026-08-26','2026-08-26',9),
  (pid,s03,'Website Blogs',array['Content','Make'],2.0,'not_started','UT','2026-08-29','2026-08-29',1),
  (pid,s03,'LinkedIn Strategy',array['Brand','Research'],2.0,'not_started','UT','2026-08-31','2026-08-31',2),
  (pid,s03,'Instagram Strategy',array['Brand','Research'],null,'not_started','UT','2026-09-01','2026-09-01',3),
  (pid,s04,'Sales Learning (Start from Saad''s live)',array['Sales','Learn'],null,'not_started',null,'2026-09-01','2026-09-01',1),
  (pid,s04,'Create Sales Strategy',array['Sales','Make'],null,'not_started',null,'2026-09-02','2026-09-02',2),
  (pid,s04,'Set up CRM and Pipeline',array['Sales','Make'],null,'not_started',null,'2026-09-03','2026-09-03',3),
  (pid,s04,'Sales scripts',array['Sales','Make'],null,'not_started',null,'2026-09-03','2026-09-03',4),
  (pid,s04,'Gather more client data',array['Sales','Research'],null,'not_started',null,'2026-09-04','2026-09-04',5),
  (pid,s04,'Sales call drills',array['Sales','Make'],null,'not_started',null,'2026-09-05','2026-09-05',6),
  (pid,s04,'Discovery meeting script and strategy',array['Sales','Make'],null,'not_started',null,'2026-09-05','2026-09-05',7),
  (pid,s04,'Onboarding strategy and script',array['Sales','Make'],null,'not_started',null,'2026-09-06','2026-09-06',8),
  (pid,s04,'Sales System Ready',array['Sales'],null,'not_started',null,'2026-09-08','2026-09-08',9),
  (pid,s05,'Start outreach',array[]::text[],null,'not_started',null,'2026-09-09','2026-09-09',1),
  (pid,s05,'First discovery call booked',array[]::text[],null,'not_started',null,'2026-09-12','2026-09-12',2),
  (pid,s07,'Copywriting Discussion',array[]::text[],null,'not_started',null,'2026-09-15','2026-09-15',1),
  (pid,s07,'Websites Review',array[]::text[],null,'not_started',null,'2026-09-16','2026-09-16',2),
  (pid,s07,'SEO Discussion',array[]::text[],null,'not_started',null,'2026-09-17','2026-09-17',3);
end $$;

-- ---- migrate assignee text -> members, labels -> tags ----
insert into public.members(project_id, name)
select distinct t.project_id, t.assignee from public.tasks t
where t.assignee is not null and t.assignee <> ''
  and not exists (select 1 from public.members m where m.project_id=t.project_id and lower(m.name)=lower(t.assignee));
update public.tasks t set assignee_id = m.id from public.members m
where m.project_id=t.project_id and lower(m.name)=lower(t.assignee) and t.assignee is not null and t.assignee_id is null;
insert into public.tags(project_id, name)
select distinct t.project_id, l from public.tasks t, unnest(t.labels) as l
where not exists (select 1 from public.tags tg where tg.project_id=t.project_id and lower(tg.name)=lower(l));

-- ---- v4: global team members + avatars ----
alter table public.members add column if not exists avatar_url text;
alter table public.members add column if not exists avatar_color text;
alter table public.members add column if not exists user_id uuid;
alter table public.members add column if not exists active boolean default true;
alter table public.members add column if not exists role text default 'member';
alter table public.members alter column project_id drop not null;
create unique index if not exists members_user_id on public.members(user_id) where user_id is not null;
create unique index if not exists members_email_uniq on public.members(lower(email)) where email is not null;

insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
on conflict (id) do nothing;
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects for select using (bucket_id = 'avatars');
drop policy if exists "avatars auth write" on storage.objects;
create policy "avatars auth write" on storage.objects for insert to authenticated with check (bucket_id = 'avatars');
drop policy if exists "avatars auth update" on storage.objects;
create policy "avatars auth update" on storage.objects for update to authenticated using (bucket_id = 'avatars');
drop policy if exists "avatars auth delete" on storage.objects;
create policy "avatars auth delete" on storage.objects for delete to authenticated using (bucket_id = 'avatars');
