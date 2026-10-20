-- Nom du voyage (ex. "Indonésie", "Vietnam partie 1") qui commence à cette
-- étape mère. Les étapes suivantes en héritent jusqu'au prochain nom.
alter table if exists public.steps
add column if not exists trip_segment text;
