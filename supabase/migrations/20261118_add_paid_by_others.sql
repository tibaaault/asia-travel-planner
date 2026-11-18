-- Part payée par quelqu'un d'autre (parents, ami...) : elle compte dans le
-- coût total du voyage mais pas dans ce que j'ai payé moi-même.
-- Les activités (JSON) portent la même information dans `paidByOthers`.
alter table if exists public.steps
add column if not exists budget_others numeric not null default 0,
add column if not exists lodging_price_others numeric not null default 0,
add column if not exists transport_price_others numeric not null default 0;

alter table if exists public.preparation_items
add column if not exists paid_by_others numeric not null default 0;
