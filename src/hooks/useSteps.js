import { useState, useEffect } from "react";
import { supabase } from "../config/supabaseClient";

export function useSteps() {
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTripId, setCurrentTripId] = useState(null);

  // --- GESTION DU CACHE ET DE LA FILE D'ATTENTE ---
  const saveToCache = (data) => {
    localStorage.setItem("offline_steps", JSON.stringify(data));
  };

  const addMutationToQueue = (mutation) => {
    const queue = JSON.parse(localStorage.getItem("offline_mutations") || "[]");
    queue.push(mutation);
    localStorage.setItem("offline_mutations", JSON.stringify(queue));
  };

  const syncOfflineMutations = async () => {
    if (!navigator.onLine) return;

    const queue = JSON.parse(localStorage.getItem("offline_mutations") || "[]");
    if (queue.length === 0) return;

    console.log(
      `📡 Retour du réseau : Synchronisation de ${queue.length} modifications...`,
    );

    for (const mutation of queue) {
      try {
        if (mutation.type === "ADD") {
          const { id, ...stepData } = mutation.payload;
          await supabase.from("steps").insert([stepData]);
        } else if (mutation.type === "UPDATE") {
          await supabase
            .from("steps")
            .update(mutation.payload)
            .eq("id", mutation.id);
        } else if (mutation.type === "DELETE") {
          await supabase.from("steps").delete().eq("id", mutation.id);
        } else if (mutation.type === "UPDATE_ORDER") {
          await supabase.from("steps").upsert(mutation.payload);
        }
      } catch (err) {
        console.error(
          "❌ Erreur lors de la synchronisation d'une mutation:",
          err,
        );
      }
    }

    localStorage.removeItem("offline_mutations");
    fetchSteps();
  };

  useEffect(() => {
    window.addEventListener("online", syncOfflineMutations);
    return () => window.removeEventListener("online", syncOfflineMutations);
  }, []);

  // --- 1. LECTURE DES ÉTAPES ---
  const fetchSteps = async () => {
    setLoading(true);
    try {
      if (!navigator.onLine) throw new Error("Navigateur hors-ligne");

      const { data: tripData, error: tripError } = await supabase
        .from("trips")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (tripError) throw tripError;

      let tripId = tripData?.id;

      if (!tripId) {
        const { data: newTrip, error: createTripError } = await supabase
          .from("trips")
          .insert([{ title: "Voyage Asie 2026", start_date: "2026-10-01" }])
          .select()
          .maybeSingle();

        if (createTripError) throw createTripError;
        tripId = newTrip?.id;
      }

      setCurrentTripId(tripId);
      localStorage.setItem("offline_trip_id", tripId);

      const { data, error } = await supabase
        .from("steps")
        .select("*")
        .eq("trip_id", tripId)
        .order("position", { ascending: true });

      if (error) throw error;

      setSteps(data || []);
      saveToCache(data || []);
      syncOfflineMutations();
    } catch (err) {
      const cachedSteps = localStorage.getItem("offline_steps");
      const cachedTripId = localStorage.getItem("offline_trip_id");
      if (cachedSteps) setSteps(JSON.parse(cachedSteps));
      if (cachedTripId) setCurrentTripId(cachedTripId);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSteps();
  }, []);

  // --- 2. AJOUTER UNE ÉTAPE ---
  const addStep = async (newStepData) => {
    if (!currentTripId) return;

    const stepToInsert = {
      trip_id: currentTripId,
      city: newStepData.city,
      country: newStepData.country,
      duration: newStepData.duration,
      position: steps.length,
      lat: newStepData.lat,
      lng: newStepData.lng,
      activities: newStepData.activities || [],
      parent_id: newStepData.parent_id || null,
    };

    if (!navigator.onLine) {
      const tempId = crypto.randomUUID
        ? crypto.randomUUID()
        : `temp-${Date.now()}`;
      const optimisticStep = { ...stepToInsert, id: tempId };
      const newSteps = [...steps, optimisticStep];

      setSteps(newSteps);
      saveToCache(newSteps);
      addMutationToQueue({ type: "ADD", payload: optimisticStep });
      return;
    }

    const { data, error } = await supabase
      .from("steps")
      .insert([stepToInsert])
      .select();
    if (error) console.error("Erreur d'ajout:", error);
    else if (data) {
      const newSteps = [...steps, data[0]];
      setSteps(newSteps);
      saveToCache(newSteps);
    }
  };

  // --- 3. SUPPRIMER UNE ÉTAPE ---
  const deleteStep = async (id) => {
    const newSteps = steps.filter((step) => step.id !== id);
    setSteps(newSteps);
    saveToCache(newSteps);

    if (!navigator.onLine) {
      if (String(id).startsWith("temp-")) {
        let queue = JSON.parse(
          localStorage.getItem("offline_mutations") || "[]",
        );
        queue = queue.filter((m) => !(m.type === "ADD" && m.payload.id === id));
        localStorage.setItem("offline_mutations", JSON.stringify(queue));
      } else {
        addMutationToQueue({ type: "DELETE", id });
      }
      return;
    }

    const { error } = await supabase.from("steps").delete().eq("id", id);
    if (error) console.error("Erreur de suppression:", error);
  };

  // --- 4. RÉORGANISER LES ÉTAPES (DND MAJ) ---
  const updateStepsOrder = async (reorderedSteps) => {
    setSteps(reorderedSteps);
    saveToCache(reorderedSteps);

    // MODIFICATION ICI : On s'assure de sauvegarder le parent_id lors du DND
    const updates = reorderedSteps.map((step, index) => ({
      id: step.id,
      city: step.city,
      country: step.country,
      duration: step.duration,
      position: index,
      activities: step.activities || [],
      parent_id: step.parent_id || null,
    }));

    if (!navigator.onLine) {
      const validUpdates = updates.filter(
        (u) => !String(u.id).startsWith("temp-"),
      );
      if (validUpdates.length > 0) {
        addMutationToQueue({ type: "UPDATE_ORDER", payload: validUpdates });
      }
      return;
    }

    const { error } = await supabase.from("steps").upsert(updates);
    if (error) console.error("Erreur de réorganisation:", error);
  };

  // --- 5. METTRE À JOUR UNE ÉTAPE ---
  const updateStep = async (id, updatedFields) => {
    const newSteps = steps.map((step) =>
      step.id === id ? { ...step, ...updatedFields } : step,
    );
    setSteps(newSteps);
    saveToCache(newSteps);

    if (!navigator.onLine) {
      if (String(id).startsWith("temp-")) {
        let queue = JSON.parse(
          localStorage.getItem("offline_mutations") || "[]",
        );
        queue = queue.map((m) =>
          m.type === "ADD" && m.payload.id === id
            ? { ...m, payload: { ...m.payload, ...updatedFields } }
            : m,
        );
        localStorage.setItem("offline_mutations", JSON.stringify(queue));
      } else {
        addMutationToQueue({ type: "UPDATE", id, payload: updatedFields });
      }
      return;
    }

    const { error } = await supabase
      .from("steps")
      .update(updatedFields)
      .eq("id", id);
    if (error) console.error("Erreur de mise à jour:", error);
  };

  return {
    steps,
    loading,
    currentTripId,
    addStep,
    deleteStep,
    updateStepsOrder,
    updateStep,
  };
}
