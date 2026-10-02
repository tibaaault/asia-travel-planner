-- Active la RLS sur les tables de l'itinéraire, restées ouvertes en écriture
-- à quiconque possède la clé publique (anon) du site.
-- Même règle que preparation_items / backpack_items : lecture publique
-- (le mode visiteur affiche l'itinéraire), écriture réservée aux comptes connectés.

alter table public.trips enable row level security;
alter table public.steps enable row level security;
alter table public.step_notes enable row level security;
alter table public.step_documents enable row level security;

create policy "trips_select_public" on public.trips for select using (true);
create policy "trips_write_authenticated" on public.trips for all to authenticated using (true) with check (true);

create policy "steps_select_public" on public.steps for select using (true);
create policy "steps_write_authenticated" on public.steps for all to authenticated using (true) with check (true);

create policy "step_notes_select_public" on public.step_notes for select using (true);
create policy "step_notes_write_authenticated" on public.step_notes for all to authenticated using (true) with check (true);

create policy "step_documents_select_public" on public.step_documents for select using (true);
create policy "step_documents_write_authenticated" on public.step_documents for all to authenticated using (true) with check (true);

-- Stockage des documents : envoi et suppression réservés aux comptes connectés.
create policy "documents_insert_authenticated" on storage.objects
  for insert to authenticated with check (bucket_id = 'documents');
create policy "documents_delete_authenticated" on storage.objects
  for delete to authenticated using (bucket_id = 'documents');

-- handle_new_user ne sert qu'au trigger de création de profil :
-- inutile de l'exposer en RPC (/rest/v1/rpc/handle_new_user).
revoke execute on function public.handle_new_user() from anon, authenticated, public;
