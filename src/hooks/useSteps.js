import { useState, useEffect } from "react";
import { supabase } from "../config/supabaseClient";

const DEFAULT_TRIP_START_DATE = "2026-10-01";

// Le client Supabase retente plusieurs fois une requête en échec avant de
// vraiment abandonner (on l'a vu prendre 7 tentatives / ~8s sur un réseau
// coupé) — sans filet, l'app reste plantée sur son spinner tout ce temps
// avant de basculer sur le cache hors-ligne. On force un abandon plus tôt.
const NETWORK_TIMEOUT_MS = 6000;
const withTimeout = (promise, ms = NETWORK_TIMEOUT_MS) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Délai réseau dépassé")), ms),
    ),
  ]);

export function useSteps() {
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTripId, setCurrentTripId] = useState(null);
  const [tripStartDate, setTripStartDate] = useState(DEFAULT_TRIP_START_DATE);

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
        } else if (mutation.type === "TRIP_UPDATE") {
          await supabase
            .from("trips")
            .update(mutation.payload)
            .eq("id", mutation.id);
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

      const { data: tripData, error: tripError } = await withTimeout(
        supabase.from("trips").select("id, start_date").limit(1).maybeSingle(),
      );

      if (tripError) throw tripError;

      let tripId = tripData?.id;
      let tripStart = tripData?.start_date;

      if (!tripId) {
        const { data: newTrip, error: createTripError } = await withTimeout(
          supabase
            .from("trips")
            .insert([
              { title: "Voyage Asie 2026", start_date: DEFAULT_TRIP_START_DATE },
            ])
            .select()
            .maybeSingle(),
        );

        if (createTripError) throw createTripError;
        tripId = newTrip?.id;
        tripStart = newTrip?.start_date;
      }

      setCurrentTripId(tripId);
      localStorage.setItem("offline_trip_id", tripId);
      if (tripStart) {
        setTripStartDate(tripStart);
        localStorage.setItem("offline_trip_start_date", tripStart);
      }

      const { data, error } = await withTimeout(
        supabase
          .from("steps")
          .select("*")
          .eq("trip_id", tripId)
          .order("position", { ascending: true }),
      );

      if (error) throw error;

      setSteps(data || []);
      saveToCache(data || []);
      syncOfflineMutations();
    } catch (err) {
      const cachedSteps = localStorage.getItem("offline_steps");
      const cachedTripId = localStorage.getItem("offline_trip_id");
      const cachedTripStart = localStorage.getItem("offline_trip_start_date");
      if (cachedSteps) setSteps(JSON.parse(cachedSteps));
      if (cachedTripId) setCurrentTripId(cachedTripId);
      if (cachedTripStart) setTripStartDate(cachedTripStart);
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

    // Repli hors-ligne : utilisé aussi bien quand navigator.onLine ment
    // (wifi capricieux qui se dit connecté) que quand la requête échoue
    // vraiment — sans ça, une coupure en cours de route perdait l'étape
    // en silence au lieu de la mettre en file d'attente.
    const queueOffline = () => {
      const tempId = crypto.randomUUID
        ? crypto.randomUUID()
        : `temp-${Date.now()}`;
      const optimisticStep = { ...stepToInsert, id: tempId };
      const newSteps = [...steps, optimisticStep];

      setSteps(newSteps);
      saveToCache(newSteps);
      addMutationToQueue({ type: "ADD", payload: optimisticStep });
    };

    if (!navigator.onLine) {
      queueOffline();
      return;
    }

    try {
      const { data, error } = await withTimeout(
        supabase.from("steps").insert([stepToInsert]).select(),
      );
      if (error) throw error;
      if (data) {
        const newSteps = [...steps, data[0]];
        setSteps(newSteps);
        saveToCache(newSteps);
      }
    } catch (err) {
      console.error("Erreur d'ajout, mise en file d'attente hors-ligne:", err);
      queueOffline();
    }
  };

  // --- 3. SUPPRIMER UNE ÉTAPE ---
  const deleteStep = async (id) => {
    const newSteps = steps.filter((step) => step.id !== id);
    setSteps(newSteps);
    saveToCache(newSteps);

    const queueOffline = () => {
      if (String(id).startsWith("temp-")) {
        let queue = JSON.parse(
          localStorage.getItem("offline_mutations") || "[]",
        );
        queue = queue.filter((m) => !(m.type === "ADD" && m.payload.id === id));
        localStorage.setItem("offline_mutations", JSON.stringify(queue));
      } else {
        addMutationToQueue({ type: "DELETE", id });
      }
    };

    if (!navigator.onLine) {
      queueOffline();
      return;
    }

    try {
      const { error } = await withTimeout(
        supabase.from("steps").delete().eq("id", id),
      );
      if (error) throw error;
    } catch (err) {
      console.error("Erreur de suppression, mise en file d'attente hors-ligne:", err);
      queueOffline();
    }
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

    const queueOffline = () => {
      const validUpdates = updates.filter(
        (u) => !String(u.id).startsWith("temp-"),
      );
      if (validUpdates.length > 0) {
        addMutationToQueue({ type: "UPDATE_ORDER", payload: validUpdates });
      }
    };

    if (!navigator.onLine) {
      queueOffline();
      return;
    }

    try {
      const { error } = await withTimeout(
        supabase.from("steps").upsert(updates),
      );
      if (error) throw error;
    } catch (err) {
      console.error("Erreur de réorganisation, mise en file d'attente hors-ligne:", err);
      queueOffline();
    }
  };

  // --- 5. METTRE À JOUR UNE ÉTAPE ---
  const updateStep = async (id, updatedFields) => {
    const newSteps = steps.map((step) =>
      step.id === id ? { ...step, ...updatedFields } : step,
    );
    setSteps(newSteps);
    saveToCache(newSteps);

    const queueOffline = () => {
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
    };

    if (!navigator.onLine) {
      queueOffline();
      return;
    }

    try {
      const { error } = await withTimeout(
        supabase.from("steps").update(updatedFields).eq("id", id),
      );
      if (error) throw error;
    } catch (err) {
      console.error("Erreur de mise à jour, mise en file d'attente hors-ligne:", err);
      queueOffline();
    }
  };

  // --- 6. METTRE À JOUR LA DATE DE DÉBUT DU VOYAGE ---
  const updateTripStartDate = async (newStartDate) => {
    if (!newStartDate) return;
    setTripStartDate(newStartDate);
    localStorage.setItem("offline_trip_start_date", newStartDate);

    if (!currentTripId) return;

    const queueOffline = () => {
      // Une seule date de voyage à la fois : la nouvelle valeur remplace
      // toute mutation TRIP_UPDATE déjà en attente plutôt que de s'empiler.
      let queue = JSON.parse(localStorage.getItem("offline_mutations") || "[]");
      queue = queue.filter((m) => m.type !== "TRIP_UPDATE");
      queue.push({ type: "TRIP_UPDATE", id: currentTripId, payload: { start_date: newStartDate } });
      localStorage.setItem("offline_mutations", JSON.stringify(queue));
    };

    if (!navigator.onLine) {
      queueOffline();
      return;
    }

    try {
      const { error } = await withTimeout(
        supabase.from("trips").update({ start_date: newStartDate }).eq("id", currentTripId),
      );
      if (error) throw error;
    } catch (err) {
      console.error("Erreur de mise à jour de la date de départ, mise en file d'attente hors-ligne:", err);
      queueOffline();
    }
  };

  return {
    steps,
    loading,
    currentTripId,
    tripStartDate,
    updateTripStartDate,
    addStep,
    deleteStep,
    updateStepsOrder,
    updateStep,
  };
}
