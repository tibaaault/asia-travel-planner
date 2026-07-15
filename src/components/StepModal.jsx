import { useState, useEffect } from 'react';
import { X, Send, User, Trash2, MessageSquare, Loader2, Hotel, Plane, Wallet, Save, CheckCircle, FileText, UploadCloud, Download } from 'lucide-react';
import { useNotes } from '../hooks/useNotes';
import { useDocuments } from '../hooks/useDocuments'; // <-- Import du nouveau hook

export default function StepModal({ step, onClose, onUpdateStep }) {
  // Hooks
  const { notes, loadingNotes, addNote, deleteNote } = useNotes(step.id);
  const { documents, loadingDocs, uploading, uploadDocument, deleteDocument } = useDocuments(step.id);
  
  // États
  const [activeTab, setActiveTab] = useState('notes'); // 'notes' | 'logistics' | 'documents'
  const [newNote, setNewNote] = useState('');
  const [username, setUsername] = useState('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);

  // États Logistique
  const [lodging, setLodging] = useState(step.lodging_info || '');
  const [transport, setTransport] = useState(step.transport_info || '');
  const [budget, setBudget] = useState(step.budget_estimated || '0');
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem('travel_username');
    if (savedName) setUsername(savedName);
    else setIsEditingUsername(true);
  }, []);

  const handleSaveUsername = (e) => {
    e.preventDefault();
    if (username.trim()) {
      localStorage.setItem('travel_username', username.trim());
      setIsEditingUsername(false);
    }
  };

  const handleSendNote = (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    addNote(username, newNote);
    setNewNote('');
  };

  const handleSaveLogistics = async (e) => {
    e.preventDefault();
    await onUpdateStep(step.id, {
      lodging_info: lodging,
      transport_info: transport,
      budget_estimated: parseFloat(budget) || 0
    });
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 2000);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) uploadDocument(file);
    // On vide l'input pour pouvoir uploader le même fichier si besoin
    e.target.value = null; 
  };

  const formatNoteDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full uppercase tracking-wider">
              {step.country}
            </span>
            <h2 className="text-2xl font-bold text-gray-900 mt-1">{step.city}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Système d'onglets (3 Tabs maintenant) */}
        <div className="flex border-b border-gray-100 bg-gray-50/50">
          <button 
            onClick={() => setActiveTab('notes')}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'notes' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <MessageSquare size={16} /> Notes
          </button>
          <button 
            onClick={() => setActiveTab('logistics')}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'logistics' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Hotel size={16} /> Logistique
          </button>
          <button 
            onClick={() => setActiveTab('documents')}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'documents' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText size={16} /> Coffre-fort
          </button>
        </div>

        {/* ---------------- ONGLET 1 : NOTES ---------------- */}
        {activeTab === 'notes' && (
          // ... Le code de tes notes (identique à avant)
          <>
            <div className="px-5 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-sm">
              {isEditingUsername ? (
                <form onSubmit={handleSaveUsername} className="flex gap-2 w-full">
                  <input type="text" placeholder="Ton prénom / pseudo" value={username} onChange={(e) => setUsername(e.target.value)} className="border border-gray-300 rounded px-2 py-1 flex-1 text-xs focus:outline-none focus:border-blue-500" required />
                  <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-semibold cursor-pointer">Valider</button>
                </form>
              ) : (
                <>
                  <span className="text-gray-600 flex items-center gap-1.5 text-xs">
                    <User size={14} className="text-gray-400" />
                    En tant que : <strong className="text-gray-800">{username}</strong>
                  </span>
                  <button onClick={() => setIsEditingUsername(true)} className="text-xs text-blue-600 hover:underline cursor-pointer">Changer</button>
                </>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-[300px]">
              {loadingNotes ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-500" /></div>
              ) : notes.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Aucune note pour le moment. Une idée à partager ?</div>
              ) : (
                notes.map((note) => {
                  const isMe = note.author_name === username;
                  return (
                    <div key={note.id} className={`flex flex-col max-w-[85%] rounded-2xl p-3 ${isMe ? 'bg-blue-500 text-white ml-auto rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'}`}>
                      <div className="flex justify-between items-baseline gap-2 mb-1">
                        <span className={`text-xs font-bold ${isMe ? 'text-blue-100' : 'text-gray-600'}`}>{note.author_name}</span>
                        <span className={`text-[10px] ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>{formatNoteDate(note.created_at)}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words">{note.content}</p>
                      {isMe && (
                        <button onClick={() => deleteNote(note.id)} className="text-blue-200 hover:text-white self-end mt-1 cursor-pointer" title="Supprimer ma note"><Trash2 size={12} /></button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSendNote} className="p-4 border-t border-gray-100 bg-white flex gap-2 rounded-b-2xl">
              <input type="text" placeholder={isEditingUsername ? "Choisis un pseudo d'abord..." : "Écris une note..."} value={newNote} onChange={(e) => setNewNote(e.target.value)} disabled={isEditingUsername} className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-50" />
              <button type="submit" disabled={isEditingUsername || !newNote.trim()} className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 disabled:bg-gray-300 transition-colors flex items-center justify-center cursor-pointer"><Send size={18} /></button>
            </form>
          </>
        )}

        {/* ---------------- ONGLET 2 : LOGISTIQUE ---------------- */}
        {activeTab === 'logistics' && (
           // ... Le code de ta logistique (identique à avant)
          <form onSubmit={handleSaveLogistics} className="flex-1 overflow-y-auto p-5 flex flex-col justify-between min-h-[365px]">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-1.5"><Hotel size={16} className="text-orange-500" /> Hébergement / Logement</label>
                <textarea value={lodging} onChange={(e) => setLodging(e.target.value)} placeholder="Nom de l'hôtel, adresse, lien Booking, prix de la nuit..." rows="2" className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 resize-none" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-1.5"><Plane size={16} className="text-blue-500" /> Transport</label>
                <textarea value={transport} onChange={(e) => setTransport(e.target.value)} placeholder="Numéro de vol, horaires de train, compagnie de bus..." rows="2" className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 resize-none" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-1.5"><Wallet size={16} className="text-emerald-500" /> Budget Estimé (EUR)</label>
                <div className="relative max-w-[150px]">
                  <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} min="0" placeholder="0" className="w-full border border-gray-200 rounded-xl pl-3 pr-8 py-2 text-sm focus:outline-none focus:border-blue-500 font-medium" />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-gray-400">€</span>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-100 mt-6 flex items-center justify-between">
              <div className="text-xs text-gray-500">Dernière mise à jour automatique dans le cloud</div>
              <button type="submit" className={`px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all cursor-pointer shadow-sm ${showSaveSuccess ? 'bg-emerald-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                {showSaveSuccess ? <><CheckCircle size={16} /> Sauvegardé !</> : <><Save size={16} /> Enregistrer les infos</>}
              </button>
            </div>
          </form>
        )}

        {/* ---------------- ONGLET 3 : COFFRE-FORT / DOCUMENTS ---------------- */}
        {activeTab === 'documents' && (
          <div className="flex-1 overflow-y-auto p-5 flex flex-col min-h-[365px]">
            
            {/* Zone d'Upload */}
            <div className="mb-6">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {uploading ? (
                    <Loader2 size={30} className="text-blue-500 animate-spin mb-2" />
                  ) : (
                    <UploadCloud size={30} className="text-gray-400 mb-2" />
                  )}
                  <p className="mb-1 text-sm text-gray-500">
                    <span className="font-semibold text-blue-600">Clique pour uploader</span>
                  </p>
                  <p className="text-xs text-gray-500">PDF, JPG ou PNG (Max. 5Mo)</p>
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".pdf,image/*" 
                  onChange={handleFileUpload} 
                  disabled={uploading}
                />
              </label>
            </div>

            {/* Liste des Fichiers */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                <FileText size={16} className="text-blue-500" /> Fichiers stockés
              </h3>

              {loadingDocs ? (
                <div className="flex justify-center py-4"><Loader2 className="animate-spin text-blue-500" /></div>
              ) : documents.length === 0 ? (
                <div className="text-center py-4 text-gray-400 text-sm bg-white border border-gray-100 rounded-xl">
                  Aucun document pour cette étape.
                </div>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                        <FileText size={18} />
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-medium text-gray-800 truncate" title={doc.file_name}>{doc.file_name}</p>
                        <p className="text-xs text-gray-400">{formatNoteDate(doc.created_at)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <a 
                        href={doc.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                        title="Télécharger / Voir"
                      >
                        <Download size={18} />
                      </a>
                      <button 
                        onClick={() => deleteDocument(doc.id, doc.file_url)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                        title="Supprimer"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}