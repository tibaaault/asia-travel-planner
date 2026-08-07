import { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import { CheckSquare, Square, Trash2, Plus, Sparkles } from 'lucide-react'; // Icônes[cite: 1]

// Suggestions adaptées à ce voyage : volcans/randonnée (Bromo, Tumpak Sewu),
// plongée (Komodo), plage et scooter (Lombok), et vol long-courrier.
const BACKPACK_SUGGESTIONS = [
  { category: 'Vêtements', name: "Veste chaude (lever de soleil au Bromo, ~5°C)" },
  { category: 'Vêtements', name: 'Chaussures de marche (volcans, cascades)' },
  { category: 'Vêtements', name: 'Maillot de bain' },
  { category: 'Vêtements', name: 'Poncho / veste de pluie' },
  { category: 'Trousse de toilette', name: 'Crème solaire' },
  { category: 'Trousse de toilette', name: 'Répulsif anti-moustiques' },
  { category: 'Trousse de toilette', name: 'Trousse de premiers secours' },
  { category: 'Tech', name: 'Lampe frontale (ascension Bromo à 3h du matin)' },
  { category: 'Tech', name: 'Batterie externe' },
  { category: 'Tech', name: 'Adaptateur prise Indonésie (Type C/F)' },
  { category: 'Tech', name: 'Caméra étanche / GoPro (plongée)' },
  { category: 'Tech', name: 'Sac étanche (plongée, bateau)' },
  { category: 'Documents', name: 'Carte de certification plongée (PADI/SSI)' },
  { category: 'Documents', name: 'Permis international (scooter)' },
  { category: 'Documents', name: 'Assurance voyage (plongée incluse)' },
  { category: 'Général', name: 'Gourde' },
];

export default function BackpackModal({ session, onClose }) {
  const [items, setItems] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Général');
  const [isLoading, setIsLoading] = useState(true);

  // Le mode visiteur bloque les modifications[cite: 1]
  const isReadOnly = !session; 

  useEffect(() => {
    fetchBackpackItems();
  }, []);

  const fetchBackpackItems = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('backpack_items')
      .select('*')
      .order('category', { ascending: true })
      .order('created_at', { ascending: false });

    if (!error && data) {
      setItems(data);
    }
    setIsLoading(false);
  };

  const addItem = async (e) => {
    e.preventDefault();
    if (isReadOnly || !newItemName.trim()) return;

    const { data, error } = await supabase
      .from('backpack_items')
      .insert([{ name: newItemName, category: newItemCategory }])
      .select()
      .single();

    if (!error && data) {
      setItems([data, ...items]);
      setNewItemName('');
    }
  };

  const toggleItem = async (id, currentStatus) => {
    if (isReadOnly) return;

    // Mise à jour optimiste (UI)
    setItems(items.map(item => item.id === id ? { ...item, is_packed: !currentStatus } : item));

    // Mise à jour BDD
    await supabase
      .from('backpack_items')
      .update({ is_packed: !currentStatus })
      .eq('id', id);
  };

  const deleteItem = async (id) => {
    if (isReadOnly) return;

    setItems(items.filter(item => item.id !== id));
    await supabase.from('backpack_items').delete().eq('id', id);
  };

  const addSuggestion = async (suggestion) => {
    if (isReadOnly) return;

    const { data, error } = await supabase
      .from('backpack_items')
      .insert([{ name: suggestion.name, category: suggestion.category }])
      .select()
      .single();

    if (!error && data) setItems([data, ...items]);
  };

  const existingNames = new Set(items.map((item) => item.name.trim().toLowerCase()));
  const availableSuggestions = BACKPACK_SUGGESTIONS.filter(
    (s) => !existingNames.has(s.name.trim().toLowerCase()),
  );

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl p-6 animate-modal-pop overflow-y-auto max-h-[90vh]">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">🎒 Sac à dos</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">Fermer</button>
        </div>

        {/* Formulaire caché si Visiteur */}
        {!isReadOnly && (
          <form onSubmit={addItem} className="flex gap-2 mb-6">
            <select 
              value={newItemCategory} 
              onChange={(e) => setNewItemCategory(e.target.value)}
              className="border p-2 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white"
            >
              <option value="Général">Général</option>
              <option value="Vêtements">Vêtements</option>
              <option value="Trousse de toilette">Trousse de toilette</option>
              <option value="Tech">Tech</option>
              <option value="Documents">Documents</option>
            </select>
            <input
              type="text"
              placeholder="Ajouter un objet..."
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="flex-1 border p-2 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white"
            />
            <button type="submit" className="bg-emerald-500 text-white p-2 rounded-lg hover:bg-emerald-600 transition flex items-center gap-1">
              <Plus size={20} /> Ajouter
            </button>
          </form>
        )}

        {!isReadOnly && availableSuggestions.length > 0 && (
          <div className="mb-6">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Sparkles size={14} className="text-emerald-500" /> Suggestions pour ce voyage
            </div>
            <div className="flex flex-wrap gap-2">
              {availableSuggestions.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => addSuggestion(s)}
                  className="rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-sm transition-colors hover:bg-emerald-100 dark:border-emerald-700 dark:bg-slate-800 dark:text-emerald-300 dark:hover:bg-emerald-900/50">
                  + {s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoading ? (
          <p className="text-center text-slate-500">Chargement...</p>
        ) : (
          <div className="space-y-4">
            {/* Regroupement par catégorie (logique simple pour l'exemple) */}
            {['Vêtements', 'Trousse de toilette', 'Tech', 'Documents', 'Général'].map(cat => {
              const catItems = items.filter(i => i.category === cat);
              if (catItems.length === 0) return null;
              
              return (
                <div key={cat} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                  <h3 className="font-semibold text-blue-600 dark:text-blue-400 mb-3">{cat}</h3>
                  <ul className="space-y-2">
                    {catItems.map(item => (
                      <li key={item.id} className="flex items-center justify-between group">
                        <button 
                          onClick={() => toggleItem(item.id, item.is_packed)}
                          disabled={isReadOnly}
                          className={`flex items-center gap-2 ${item.is_packed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'} ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                          {item.is_packed ? <CheckSquare size={18} className="text-emerald-500" /> : <Square size={18} />}
                          {item.name}
                        </button>
                        
                        {!isReadOnly && (
                          <button
                            onClick={() => deleteItem(item.id)}
                            aria-label={`Supprimer ${item.name}`}
                            title="Supprimer"
                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}