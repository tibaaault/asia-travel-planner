import { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient'; 
import { CheckSquare, Square, Trash2, Plus } from 'lucide-react'; // Icônes[cite: 1]

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