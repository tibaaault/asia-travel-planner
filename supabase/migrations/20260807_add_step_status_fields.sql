alter table if exists public.steps
add column if not exists lodging_status text not null default 'A_RESERVER',
add column if not exists transport_status text not null default 'A_RESERVER';
