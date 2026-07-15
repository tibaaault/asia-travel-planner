import { useState, useEffect } from "react";
import { supabase } from "../config/supabaseClient";

export function useSteps() {
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTripId, setCurrentTripId] = useState(null);

  // 1. Lire les étapes (Triées par position)
  const fetchSteps = async () => {
    setLoading(true);

    // On utilise .maybeSingle() pour éviter l'erreur 406 si la table est vide
    const { data: tripData, error: tripError } = await supabase
      .from('trips')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (tripError) {
      console.error("Erreur lors de la recherche du voyage:", tripError);
      setLoading(false);
      return;
    }

    let tripId = tripData?.id;

    // 🚀 SÉCURITÉ : Si aucun voyage n'existe en base, on le crée automatiquement en JS !
    if (!tripId) {
      const { data: newTrip, error: createTripError } = await supabase
        .from('trips')
        .insert([{ title: 'Voyage Asie 2026', start_date: '2026-10-01' }])
        .select()
        .maybeSingle();

      if (createTripError) {
        console.error("Impossible de créer le voyage par défaut:", createTripError);
        setLoading(false);
        return;
      }
      tripId = newTrip?.id;
    }

    setCurrentTripId(tripId);

    // On récupère les étapes liées à CE voyage spécifique
    const { data, error } = await supabase
      .from('steps')
      .select('*')
      .eq('trip_id', tripId) // Filtre de sécurité pour n'avoir que les étapes du voyage actif
      .order('position', { ascending: true });

    if (error) console.error("Erreur de récupération des étapes:", error);
    else setSteps(data || []);
    
    setLoading(false);
  };

  // Charge les données au premier affichage
  useEffect(() => {
    fetchSteps();
  }, []);

  // 2. Ajouter une étape
  const addStep = async (newStepData) => {
    if (!currentTripId) return; // Sécurité

    const stepToInsert = {
      trip_id: currentTripId, // On lie l'étape au voyage !
      city: newStepData.city,
      country: newStepData.country,
      duration: newStepData.duration,
      position: steps.length,
      lat: newStepData.lat, 
      lng: newStepData.lng  
    };

    const { data, error } = await supabase
      .from("steps")
      .insert([stepToInsert])
      .select(); // On demande à Supabase de nous renvoyer la ligne créée (avec son vrai ID)

    if (error) {
      console.error("Erreur d'ajout:", error);
    } else if (data) {
      setSteps([...steps, data[0]]); // On met à jour l'affichage
    }
  };

  // 3. Supprimer une étape
  const deleteStep = async (id) => {
    const { error } = await supabase.from("steps").delete().eq("id", id);

    if (error) {
      console.error("Erreur de suppression:", error);
    } else {
      setSteps(steps.filter((step) => step.id !== id));
    }
  };

  // 4. Mettre à jour l'ordre (Drag & Drop)
  const updateStepsOrder = async (reorderedSteps) => {
    // Mise à jour immédiate de l'affichage (Optimistic UI pour la fluidité)
    setSteps(reorderedSteps);

    // Préparation des données pour Supabase (on met à jour la position de chaque élément)
    const updates = reorderedSteps.map((step, index) => ({
      id: step.id,
      city: step.city,
      country: step.country,
      duration: step.duration,
      position: index, // C'est ici que l'ordre change !
    }));

    // Upsert = Update ou Insert. Pratique pour mettre à jour plusieurs lignes d'un coup.
    const { error } = await supabase.from("steps").upsert(updates);

    if (error) console.error("Erreur de réorganisation:", error);
  };

  const updateStep = async (id, updatedFields) => {
    const { data, error } = await supabase
      .from('steps')
      .update(updatedFields)
      .eq('id', id)
      .select();

    if (error) {
      console.error("Erreur de mise à jour de l'étape:", error);
    } else if (data) {
      // On met à jour l'état local pour répercuter les changements immédiatement
      setSteps(steps.map(step => step.id === id ? { ...step, ...data[0] } : step));
    }
  };

  return { steps, loading, addStep, deleteStep, updateStepsOrder, updateStep };
}
