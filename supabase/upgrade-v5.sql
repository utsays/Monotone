-- =====================================================================
-- Upgrade v5 — project archiving
-- Run once in the Supabase SQL editor. Safe to re-run (idempotent).
-- =====================================================================
alter table public.projects add column if not exists archived boolean not null default false;
