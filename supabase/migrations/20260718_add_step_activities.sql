alter table if exists public.steps
add column if not exists activities jsonb not null default '[]'::jsonb;