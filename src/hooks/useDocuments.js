import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabaseClient';

export function useDocuments(stepId) {
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploading, setUploading] = useState(false);

  // 1. Récupérer la liste des documents de cette étape
  const fetchDocuments = useCallback(async () => {
    if (!stepId) return;
    setLoadingDocs(true);
    
    const { data, error } = await supabase
      .from('step_documents')
      .select('*')
      .eq('step_id', stepId)
      .order('created_at', { ascending: false });

    if (error) console.error("Erreur récupération documents:", error);
    else setDocuments(data || []);
    
    setLoadingDocs(false);
  }, [stepId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // 2. Uploader un nouveau document
  const uploadDocument = async (file) => {
    if (!stepId || !file) return;
    setUploading(true);

    try {
      // A. On génère un nom unique pour éviter d'écraser un fichier existant
      const fileExt = file.name.split('.').pop();
      const safeName = file.name.replace(/[^a-zA-Z0-9]/g, '_');
      const uniqueFileName = `${stepId}/${Date.now()}_${safeName}.${fileExt}`;

      // B. Envoi du fichier dans Supabase Storage (Bucket 'documents')
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(uniqueFileName, file);

      if (uploadError) throw uploadError;

      // C. Récupération de l'URL publique générée par Supabase
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(uniqueFileName);

      // D. Enregistrement des infos dans notre table SQL
      const { data: insertData, error: dbError } = await supabase
        .from('step_documents')
        .insert([{ step_id: stepId, file_name: file.name, file_url: publicUrl }])
        .select();

      if (dbError) throw dbError;
      
      // E. Mise à jour de l'affichage
      if (insertData) setDocuments((prev) => [insertData[0], ...prev]);
    } catch (error) {
      console.error("Erreur lors de l'upload:", error);
      alert("Une erreur est survenue lors de l'envoi du fichier.");
    } finally {
      setUploading(false);
    }
  };

  // 3. Supprimer un document
  const deleteDocument = async (docId, fileUrl) => {
    if (!window.confirm("Supprimer ce document ?")) return;

    // Suppression en base de données
    await supabase.from('step_documents').delete().eq('id', docId);

    // Suppression physique dans le Storage (optionnel mais plus propre pour ton stockage)
    const urlParts = fileUrl.split('/documents/');
    if (urlParts.length === 2) {
      await supabase.storage.from('documents').remove([urlParts[1]]);
    }

    setDocuments((prev) => prev.filter(doc => doc.id !== docId));
  };

  return { documents, loadingDocs, uploading, uploadDocument, deleteDocument };
}