// Identifiant unique d'une activité. L'horodatage seul suffisait tant qu'on
// ajoutait à la main, mais deux ajouts dans la même milliseconde (saisie
// rapide + synchronisation) auraient partagé le même identifiant.
export const createId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
