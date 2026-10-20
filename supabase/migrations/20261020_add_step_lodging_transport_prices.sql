alter table if exists public.steps
add column if not exists lodging_price_estimated numeric not null default 0,
add column if not exists lodging_price_paid numeric not null default 0,
add column if not exists transport_price_estimated numeric not null default 0,
add column if not exists transport_price_paid numeric not null default 0;
