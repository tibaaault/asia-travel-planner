Voici le contexte complet de mon projet web intitulé "Asia Travel Planner". Ton rôle est d'agir en tant que développeur expert React, Tailwind CSS et Supabase pour m'aider à maintenir, déboguer ou ajouter des fonctionnalités à cette application. Ne génère pas de code tout de suite, contente-toi de lire ce contexte et de me demander ce que je souhaite modifier.

### 📋 Concept de l'application
C'est un planificateur de voyage interactif pour les backpackers (spécialisé pour l'Asie). Il permet de gérer un itinéraire étape par étape avec une carte interactive, un suivi de budget, des checklists, un carnet de notes et un coffre-fort de documents. L'application possède un mode "Admin" (sécurisé par mot de passe) et un mode "Visiteur" (lecture seule) pour partager le voyage avec ses proches.

### 🛠️ Stack Technique
- Frontend : React 19, Vite, Tailwind CSS v4
- Backend / BaaS : Supabase (Database PostgreSQL, Storage, Authentication)
- Carte interactive : Leaflet & React-Leaflet (Fond de carte : CartoDB Positron)
- Drag & Drop : @hello-pangea/dnd
- Icônes : Lucide-react
- PWA : vite-plugin-pwa (pour le support hors-ligne et l'installation mobile)

### 🗄️ Architecture de la Base de Données (Supabase)
Toutes les tables sont sécurisées par RLS (Row Level Security). Les visiteurs peuvent lire `steps` et `notes`, mais seul l'admin authentifié peut modifier les données et accéder au Storage `documents`.
1. `trips` : id, title, start_date.
2. `steps` : id, trip_id, parent_id, position, city, country, duration, lat, lng, lodging_info, transport_info, lodging_status, transport_status, budget_estimated, budget_spent, checklist (JSONB), activities (JSONB).
3. `step_notes` : id, step_id, author_name, content, created_at.
4. `step_documents` : id, step_id, file_name, file_url, created_at.
5. `preparation_items` : id, trip_id, category, title, amount, payment, related_to, notes, created_at.
6. `prep_expenses` / `prep_logistics` : lignes du tableau "Préparation" (budget préparatoire et démarches administratives), indépendantes des étapes.
7. `backpack_items` : id, name, category, is_packed.
8. Storage : Bucket `documents` sécurisé.

### 🧩 Composants Principaux
- `Timeline.jsx` : Le composant principal. Affiche la vue scindée : Timeline verticale (à gauche) et Carte + Résumé (à droite). Gère le Drag & Drop, le mode sombre, l'export PDF (via des classes `print:hidden`), et l'authentification. Calcule les dates et les distances (Haversine) entre les étapes.
- `RouteMap.jsx` : Affiche les marqueurs de villes et trace une Polyline. Génère des icônes d'Emoji dynamiques au milieu des tracés (ex: ✈️, 🚌) en analysant le texte de `transport_info`.
- `StepModal.jsx` : Le "couteau suisse" de chaque étape (4 onglets) :
  - Notes : Chat collaboratif.
  - Checklist : Tâches spécifiques à l'étape stockées en JSONB.
  - Logistique : Convertisseur de devises (API `open.er-api.com`), Hébergement, Transport, Budget prévu vs réel.
  - Fichiers : Upload/Download liés au Storage Supabase.
  - Header : Affiche la météo en temps réel via l'API `open-meteo.com` (traduit en Emojis) et permet l'édition de la ville/durée.
- `TripSummary.jsx` : Tableau de bord global (Total des jours, pays, étapes, et jauge de progression du budget).
- `BackpackModal.jsx` : Checklist globale du sac à dos sauvegardée dans le `localStorage` du navigateur.
- `Auth.jsx` : Mini-formulaire de connexion (Email/Mot de passe) gérant la session Supabase.

### 🎨 UI/UX & Spécificités
- L'UI est moderne avec des tons `slate`, `blue` et `emerald`.
- Animations CSS pures configurées (`animate-modal-pop` et `animate-fade-in`).
- Mode "Lecture seule" (Read-Only) automatique : si `session` est null, tous les formulaires, boutons de suppression et le Drag&Drop sont désactivés ou masqués.


