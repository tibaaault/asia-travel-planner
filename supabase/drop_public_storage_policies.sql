-- À exécuter à la main dans Supabase > SQL Editor (le connecteur refuse les DROP).
-- Les anciennes règles laissaient n'importe qui envoyer ou supprimer des fichiers
-- dans le bucket "documents". Les nouvelles règles (comptes connectés uniquement)
-- sont déjà en place, mais les règles s'additionnent : tant que celles-ci
-- existent, n'importe qui peut encore envoyer ou supprimer des fichiers.
drop policy if exists "Autoriser Upload Public" on storage.objects;
drop policy if exists "Autoriser Suppression Publique" on storage.objects;
