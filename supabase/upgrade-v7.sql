-- =====================================================================
-- Upgrade v7 — project ordering (drag to reorder the project tabs)
-- Run once in the Supabase SQL editor. Safe to re-run (idempotent).
-- =====================================================================
alter table public.projects add column if not exists position int;

-- Seed positions from creation order for any project that doesn't have one yet.
with ordered as (
  select id, row_number() over (order by created_at) - 1 as rn from public.projects
)
update public.projects p set position = o.rn
from ordered o where p.id = o.id and p.position is null;
