import { useState, useEffect } from 'react';
import { X, Send, User, Trash2, MessageSquare, Loader2, Hotel, Plane, Wallet, Save, CheckCircle, FileText, UploadCloud, Download, CheckSquare, Edit2, PlusCircle, Calculator } from 'lucide-react';
import { useNotes } from '../hooks/useNotes';
import { useDocuments } from '../hooks/useDocuments';

const getWeatherEmoji = (code) => {
  if (code === 0) return '☀️'; 
  if (code > 0 && code <= 3) return '⛅'; 
  if (code >= 45 && code <= 48) return '🌫️'; 
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return '🌧️'; 
  if (code >= 71 && code <= 77 || code === 85 || code === 86) return '❄️'; 
  if (code >= 95) return '⛈️'; 
  return '🌡️';
};

// --- NOUVEAU : On récupère isReadOnly dans les props ---
export default function StepModal({ step, onClose, onUpdateStep, isReadOnly }) {
  const { notes, loadingNotes, addNote, deleteNote } = useNotes(step.id);
  const { documents, loadingDocs, uploading, uploadDocument, deleteDocument } = useDocuments(step.id);
  
  const [activeTab, setActiveTab] = useState('notes'); 
  const [username, setUsername] = useState('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);

  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [editCity, setEditCity] = useState(step.city);
  const [editCountry, setEditCountry] = useState(step.country);
  const [editDuration, setEditDuration] = useState(step.duration);

  const [newNote, setNewNote] = useState('');

  const [lodging, setLodging] = useState(step.lodging_info || '');
  const [transport, setTransport] = useState(step.transport_info || '');
  const [budget, setBudget] = useState(step.budget_estimated || '0');
  const [budgetSpent, setBudgetSpent] = useState(step.budget_spent || '0');

  const [checklist, setChecklist] = useState(step.checklist || []);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  const [exchangeRates, setExchangeRates] = useState(null);
  const [localCurrency, setLocalCurrency] = useState('THB');
  const [localAmount, setLocalAmount] = useState('');
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    const savedName = localStorage.getItem('travel_username');
    if (savedName) setUsername(savedName);
    else if (!isReadOnly) setIsEditingUsername(true); // Pas de forçage de pseudo en lecture seule
  }, [isReadOnly]);

  useEffect(() => {
    if (step.lat && step.lng) {
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${step.lat}&longitude=${step.lng}&current_weather=true`)
        .then(res => res.json())
        .then(data => {
          if (data.current_weather) {
            setWeather({
              temp: Math.round(data.current_weather.temperature),
              emoji: getWeatherEmoji(data.current_weather.weathercode)
            });
          }
        })
        .catch(err => console.error("Erreur météo:", err));
    }
  }, [step.lat, step.lng]);

  useEffect(() => {
    if (activeTab === 'logistics' && !exchangeRates) {
      fetch('https://open.er-api.com/v6/latest/EUR')
        .then(res => res.json())
        .then(data => setExchangeRates(data.rates))
        .catch(err => console.error("Erreur devises:", err));
    }
  }, [activeTab, exchangeRates]);

  const convertedAmount = (localAmount && exchangeRates && exchangeRates[localCurrency]) 
    ? (parseFloat(localAmount) / exchangeRates[localCurrency]).toFixed(2) 
    : '0.00';

  const handleSaveUsername = (e) => {
    e.preventDefault();
    if (username.trim()) {
      localStorage.setItem('travel_username', username.trim());
      setIsEditingUsername(false);
    }
  };

  const handleSaveHeader = async () => {
    if (isReadOnly) return;
    await onUpdateStep(step.id, { city: editCity, country: editCountry, duration: parseInt(editDuration, 10) || 1 });
    setIsEditingHeader(false);
  };

  const handleSendNote = (e) => {
    e.preventDefault();
    if (!newNote.trim() || isReadOnly) return;
    addNote(username || 'Visiteur', newNote);
    setNewNote('');
  };

  const formatNoteDate = (dateString) => {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(dateString));
  };

  const handleSaveLogistics = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;
    await onUpdateStep(step.id, {
      lodging_info: lodging, transport_info: transport,
      budget_estimated: parseFloat(budget) || 0, budget_spent: parseFloat(budgetSpent) || 0
    });
    // On peut tricher un peu en affichant le bouton sauvegardé même en readOnly (même s'il est masqué)
  };

  const handleFileUpload = (e) => {
    if (isReadOnly) return;
    const file = e.target.files[0];
    if (file) uploadDocument(file);
    e.target.value = null; 
  };

  const handleAddChecklistItem = async (e) => {
    e.preventDefault();
    if (!newChecklistItem.trim() || isReadOnly) return;
    const updatedList = [...checklist, { id: Date.now().toString(), text: newChecklistItem, checked: false }];
    setChecklist(updatedList);
    setNewChecklistItem('');
    await onUpdateStep(step.id, { checklist: updatedList });
  };

  const toggleChecklistItem = async (itemId) => {
    if (isReadOnly) return;
    const updatedList = checklist.map(item => item.id === itemId ? { ...item, checked: !item.checked } : item);
    setChecklist(updatedList);
    await onUpdateStep(step.id, { checklist: updatedList });
  };

  const deleteChecklistItem = async (itemId) => {
    if (isReadOnly) return;
    const updatedList = checklist.filter(item => item.id !== itemId);
    setChecklist(updatedList);
    await onUpdateStep(step.id, { checklist: updatedList });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] animate-modal-pop">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-start justify-between bg-blue-50/30 rounded-t-2xl">
          {isEditingHeader && !isReadOnly ? (
            <div className="flex-1 mr-4 space-y-2">
              {/* ... Mode édition ... */}
              <input type="text" value={editCountry} onChange={e => setEditCountry(e.target.value)} className="w-full text-xs font-semibold text-blue-600 bg-white border border-gray-200 px-2 py-1 rounded uppercase tracking-wider focus:outline-none focus:border-blue-500" placeholder="Pays" />
              <input type="text" value={editCity} onChange={e => setEditCity(e.target.value)} className="w-full text-xl font-bold text-gray-900 bg-white border border-gray-200 px-2 py-1 rounded focus:outline-none focus:border-blue-500" placeholder="Ville" />
              <div className="flex items-center gap-2">
                <input type="number" min="1" value={editDuration} onChange={e => setEditDuration(e.target.value)} className="w-20 text-sm bg-white border border-gray-200 px-2 py-1 rounded focus:outline-none focus:border-blue-500" placeholder="Jours" />
                <span className="text-sm text-gray-500">jours</span>
              </div>
              <button onClick={handleSaveHeader} className="mt-2 bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors cursor-pointer">
                Valider
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full uppercase tracking-wider border border-blue-100">
                  {step.country}
                </span>
                {weather && (
                  <span className="text-xs font-medium text-gray-600 bg-white px-2 py-1 rounded-full flex items-center gap-1 border border-gray-200 shadow-sm" title="Météo actuelle">
                    {weather.emoji} {weather.temp}°C
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <h2 className="text-2xl font-bold text-gray-900">{step.city}</h2>
                {/* On cache le bouton d'édition */}
                {!isReadOnly && (
                  <button onClick={() => setIsEditingHeader(true)} className="text-gray-400 hover:text-blue-500 transition-colors p-1 rounded-full hover:bg-blue-50 cursor-pointer" title="Éditer l'étape">
                    <Edit2 size={16} />
                  </button>
                )}
              </div>
              <p className="text-sm font-medium text-gray-500 mt-1">Durée : {step.duration} jours</p>
            </div>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full cursor-pointer transition-colors bg-white shadow-sm border border-gray-100">
            <X size={20} />
          </button>
        </div>

        {/* Système d'onglets (Inchangé) */}
        <div className="flex border-b border-gray-100 bg-gray-50 overflow-x-auto hide-scrollbar">
          <button onClick={() => setActiveTab('notes')} className={`flex-1 py-3 px-2 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'notes' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><MessageSquare size={16} /> Notes</button>
          <button onClick={() => setActiveTab('checklist')} className={`flex-1 py-3 px-2 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'checklist' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><CheckSquare size={16} /> Checklist</button>
          <button onClick={() => setActiveTab('logistics')} className={`flex-1 py-3 px-2 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'logistics' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><Hotel size={16} /> Logistique</button>
          <button onClick={() => setActiveTab('documents')} className={`flex-1 py-3 px-2 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'documents' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><FileText size={16} /> Fichiers</button>
        </div>

        {/* ONGLET 1 : NOTES */}
        {activeTab === 'notes' && (
          <>
            {!isReadOnly && (
              <div className="px-5 py-2 bg-white border-b border-gray-100 flex items-center justify-between text-sm">
                {isEditingUsername ? (
                  <form onSubmit={handleSaveUsername} className="flex gap-2 w-full">
                    <input type="text" placeholder="Ton prénom" value={username} onChange={(e) => setUsername(e.target.value)} className="border border-gray-300 rounded px-2 py-1 flex-1 text-xs focus:outline-none focus:border-blue-500" required />
                    <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-semibold cursor-pointer">Valider</button>
                  </form>
                ) : (
                  <>
                    <span className="text-gray-600 flex items-center gap-1.5 text-xs"><User size={14} className="text-gray-400" /> En tant que : <strong className="text-gray-800">{username}</strong></span>
                    <button onClick={() => setIsEditingUsername(true)} className="text-xs text-blue-600 hover:underline cursor-pointer">Changer</button>
                  </>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-[300px]">
              {loadingNotes ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-500" /></div>
              ) : notes.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Aucune note pour le moment.</div>
              ) : (
                notes.map((note) => {
                  const isMe = note.author_name === username;
                  return (
                    <div key={note.id} className={`flex flex-col max-w-[85%] rounded-2xl p-3 ${isMe && !isReadOnly ? 'bg-blue-500 text-white ml-auto rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'}`}>
                      <div className="flex justify-between items-baseline gap-2 mb-1">
                        <span className={`text-xs font-bold ${isMe && !isReadOnly ? 'text-blue-100' : 'text-gray-600'}`}>{note.author_name}</span>
                        <span className={`text-[10px] ${isMe && !isReadOnly ? 'text-blue-200' : 'text-gray-400'}`}>{formatNoteDate(note.created_at)}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words">{note.content}</p>
                      {isMe && !isReadOnly && (
                        <button onClick={() => deleteNote(note.id)} className="text-blue-200 hover:text-white self-end mt-1 cursor-pointer"><Trash2 size={12} /></button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {!isReadOnly && (
              <form onSubmit={handleSendNote} className="p-4 border-t border-gray-100 bg-white flex gap-2 rounded-b-2xl">
                <input type="text" placeholder="Écris une note..." value={newNote} onChange={(e) => setNewNote(e.target.value)} disabled={isEditingUsername} className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-50" />
                <button type="submit" disabled={isEditingUsername || !newNote.trim()} className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 disabled:bg-gray-300 transition-colors cursor-pointer"><Send size={18} /></button>
              </form>
            )}
          </>
        )}

        {/* ONGLET 2 : CHECKLIST */}
        {activeTab === 'checklist' && (
          <div className="flex-1 overflow-y-auto flex flex-col min-h-[365px] bg-white rounded-b-2xl">
            <div className="p-5 flex-1">
              <div className="space-y-2 mb-6">
                {checklist.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4 italic border border-dashed border-gray-200 rounded-xl">La liste est vide.</p>
                ) : (
                  checklist.map(item => (
                    <div key={item.id} className={`flex items-center justify-between p-3 border rounded-xl transition-all ${item.checked ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200 shadow-sm'}`}>
                      <div className={`flex items-center gap-3 overflow-hidden flex-1 ${!isReadOnly ? 'cursor-pointer' : ''}`} onClick={() => toggleChecklistItem(item.id)}>
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${item.checked ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-gray-300'}`}>
                          {item.checked && <CheckSquare size={14} className="text-white" />}
                        </div>
                        <span className={`text-sm truncate transition-all ${item.checked ? 'text-gray-400 line-through' : 'text-gray-700 font-medium'}`}>
                          {item.text}
                        </span>
                      </div>
                      {!isReadOnly && (
                        <button onClick={() => deleteChecklistItem(item.id)} className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 ml-2 transition-colors cursor-pointer"><Trash2 size={16} /></button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
            {!isReadOnly && (
              <form onSubmit={handleAddChecklistItem} className="p-4 border-t border-gray-100 bg-gray-50 flex gap-2">
                <input type="text" placeholder="Ajouter une tâche..." value={newChecklistItem} onChange={(e) => setNewChecklistItem(e.target.value)} className="flex-1 border border-gray-200 bg-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500" />
                <button type="submit" disabled={!newChecklistItem.trim()} className="bg-emerald-500 text-white px-4 py-2 rounded-xl hover:bg-emerald-600 disabled:bg-gray-300 transition-colors flex items-center gap-2 cursor-pointer font-medium text-sm"><PlusCircle size={18} /> Ajouter</button>
              </form>
            )}
          </div>
        )}

        {/* ONGLET 3 : LOGISTIQUE */}
        {activeTab === 'logistics' && (
          <form onSubmit={handleSaveLogistics} className="flex-1 overflow-y-auto p-5 flex flex-col justify-between min-h-[365px] bg-white rounded-b-2xl">
            <div className="space-y-5"> 
              {/* Le Convertisseur (Toujours actif pour faire des calculs même en lecture seule) */}
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3"><Calculator size={16} className="text-blue-500" /> Convertisseur Rapide</label>
                <div className="flex gap-2 items-center">
                  <input type="number" min="0" placeholder="Montant..." value={localAmount} onChange={(e) => setLocalAmount(e.target.value)} className="w-1/3 border border-gray-300 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                  <select value={localCurrency} onChange={(e) => setLocalCurrency(e.target.value)} className="w-1/3 border border-gray-300 bg-white rounded-lg px-2 py-2 text-sm font-medium focus:outline-none focus:border-blue-500 cursor-pointer truncate">
                    <option value="THB">THB</option>
                    <option value="VND">VND</option>
                    <option value="IDR">IDR</option>
                    <option value="JPY">JPY</option>
                    <option value="USD">USD</option>
                  </select>
                  <span className="font-bold text-gray-400 mx-1">=</span>
                  <div className="w-1/3 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-emerald-600 text-center flex items-center justify-center">
                    {!exchangeRates ? <Loader2 size={16} className="animate-spin text-gray-400" /> : `${convertedAmount} €`}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-1.5"><Hotel size={16} className="text-orange-500" /> Hébergement</label>
                <textarea value={lodging} onChange={(e) => setLodging(e.target.value)} disabled={isReadOnly} placeholder="Nom, adresse, lien Booking..." rows="2" className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 resize-none disabled:bg-gray-50 disabled:text-gray-700" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-1.5"><Plane size={16} className="text-blue-500" /> Transport vers l'étape</label>
                <textarea value={transport} onChange={(e) => setTransport(e.target.value)} disabled={isReadOnly} placeholder="Vol, horaires, bus..." rows="2" className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 resize-none disabled:bg-gray-50 disabled:text-gray-700" />
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-1.5"><Wallet size={16} className="text-gray-400" /> Prévu</label>
                  <div className="relative">
                    <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} disabled={isReadOnly} className="w-full border border-gray-200 rounded-xl pl-3 pr-8 py-2 text-sm focus:outline-none focus:border-blue-500 font-medium text-gray-600 bg-gray-50 disabled:bg-transparent" />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-gray-400">€</span>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-1.5"><Wallet size={16} className="text-emerald-500" /> Dépensé</label>
                  <div className="relative">
                    <input type="number" value={budgetSpent} onChange={(e) => setBudgetSpent(e.target.value)} disabled={isReadOnly} className="w-full border border-emerald-200 rounded-xl pl-3 pr-8 py-2 text-sm focus:outline-none focus:border-emerald-500 font-bold text-emerald-700 bg-emerald-50/30 disabled:bg-emerald-50/10" />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-emerald-500">€</span>
                  </div>
                </div>
              </div>
            </div>
            
            {!isReadOnly && (
              <div className="pt-4 border-t border-gray-100 mt-6 flex items-center justify-between">
                <div className="text-xs text-gray-400">Synchro automatique</div>
                <button type="submit" className="px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all cursor-pointer shadow-sm bg-blue-600 hover:bg-blue-700 text-white">
                  <Save size={16} /> Enregistrer
                </button>
              </div>
            )}
          </form>
        )}

        {/* ONGLET 4 : DOCUMENTS */}
        {activeTab === 'documents' && (
          <div className="flex-1 overflow-y-auto p-5 flex flex-col min-h-[365px] bg-white rounded-b-2xl">
            {!isReadOnly && (
              <div className="mb-6">
                <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-blue-50 hover:border-blue-300 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {uploading ? <Loader2 size={24} className="text-blue-500 animate-spin mb-2" /> : <UploadCloud size={24} className="text-blue-400 mb-2" />}
                    <p className="text-sm text-gray-500"><span className="font-semibold text-blue-600">Clique pour uploader</span></p>
                  </div>
                  <input type="file" className="hidden" accept=".pdf,image/*" onChange={handleFileUpload} disabled={uploading} />
                </label>
              </div>
            )}
            
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3"><FileText size={16} className="text-blue-500" /> Vos Fichiers</h3>
              {loadingDocs ? (
                <div className="flex justify-center py-4"><Loader2 className="animate-spin text-blue-500" /></div>
              ) : documents.length === 0 ? (
                <div className="text-center py-4 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">Aucun document.</div>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><FileText size={18} /></div>
                      <div className="truncate">
                        <p className="text-sm font-medium text-gray-800 truncate">{doc.file_name}</p>
                        <p className="text-[10px] text-gray-400">{formatNoteDate(doc.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-600 hover:bg-blue-50 rounded-full" title="Ouvrir"><Download size={16} /></a>
                      {!isReadOnly && (
                        <button onClick={() => deleteDocument(doc.id, doc.file_url)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full cursor-pointer"><Trash2 size={16} /></button>
                      )}
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