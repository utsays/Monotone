-- ============================================================
--  Agency Dashboard — v4: global team members + avatars
--  Run once in Supabase → SQL Editor. Idempotent.
-- ============================================================

-- Members become the global team directory ------------------
alter table public.members add column if not exists avatar_url text;
alter table public.members add column if not exists avatar_color text;
alter table public.members add column if not exists user_id uuid;
alter table public.members add column if not exists active boolean default true;
alter table public.members add column if not exists role text default 'member';
-- allow global (project-less) members
alter table public.members alter column project_id drop not null;
create unique index if not exists members_user_id on public.members(user_id) where user_id is not null;
create unique index if not exists members_email_uniq on public.members(lower(email)) where email is not null;

-- Avatars storage bucket (public read, auth write) -----------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');
drop policy if exists "avatars auth write" on storage.objects;
create policy "avatars auth write" on storage.objects
  for insert to authenticated with check (bucket_id = 'avatars');
drop policy if exists "avatars auth update" on storage.objects;
create policy "avatars auth update" on storage.objects
  for update to authenticated using (bucket_id = 'avatars');
drop policy if exists "avatars auth delete" on storage.objects;
create policy "avatars auth delete" on storage.objects
  for delete to authenticated using (bucket_id = 'avatars');
