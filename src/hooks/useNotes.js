import { useState, useEffect, useCallback } from "react";
import { supabase } from "../config/supabaseClient";

export function useNotes(stepId) {
  const [notes, setNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Charger les notes de cette étape
  const fetchNotes = useCallback(async () => {
    if (!stepId) return;
    setLoadingNotes(true);
    const { data, error } = await supabase
      .from("step_notes")
      .select("*")
      .eq("step_id", stepId)
      .order("created_at", { ascending: true });

    if (error) console.error("Erreur notes:", error);
    else setNotes(data || []);
    setLoadingNotes(false);
  }, [stepId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Ajouter une note
  const addNote = async (authorName, content) => {
    if (!stepId || !authorName.trim() || !content.trim()) return;

    const { data, error } = await supabase
      .from("step_notes")
      .insert([{ step_id: stepId, author_name: authorName, content }])
      .select();

    if (error) console.error("Erreur d'ajout de note:", error);
    else if (data) setNotes((prev) => [...prev, data[0]]);
  };

  // Supprimer une note (uniquement si on s'est trompé par exemple)
  const deleteNote = async (noteId) => {
    const { error } = await supabase
      .from("step_notes")
      .delete()
      .eq("id", noteId);

    if (error) console.error("Erreur de suppression de note:", error);
    else setNotes((prev) => prev.filter((note) => note.id !== noteId));
  };

  // Modifier une note existante
  const updateNote = async (noteId, content) => {
    if (!noteId || !content.trim()) return;

    const { data, error } = await supabase
      .from("step_notes")
      .update({ content })
      .eq("id", noteId)
      .select()
      .single();

    if (error) console.error("Erreur de modification de note:", error);
    else if (data) {
      setNotes((prev) =>
        prev.map((note) => (note.id === noteId ? data : note)),
      );
    }
  };

  return { notes, loadingNotes, addNote, deleteNote, updateNote };
}
