import { useState, useEffect } from 'react';
import { X, CheckSquare, PlusCircle, Trash2, Backpack } from 'lucide-react';

export default function BackpackModal({ onClose }) {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState('');

  // Charger la checklist depuis le navigateur
  useEffect(() => {
    const saved = localStorage.getItem('travel_backpack');
    if (saved) setItems(JSON.parse(saved));
  }, []);

  const save = (newItems) => {
    setItems(newItems);
    localStorage.setItem('travel_backpack', JSON.stringify(newItems));
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    save([...items, { id: Date.now(), text: newItem, packed: false }]);
    setNewItem('');
  };

  const toggleItem = (id) => {
    save(items.map(item => item.id === id ? { ...item, packed: !item.packed } : item));
  };

  const deleteItem = (id) => {
    save(items.filter(item => item.id !== id));
  };

  const progress = items.length > 0 ? Math.round((items.filter(i => i.packed).length / items.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm print:hidden animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-slate-100 animate-modal-pop">
        
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
              <Backpack size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Mon Sac à Dos</h2>
              <div className="w-32 bg-slate-200 rounded-full h-1.5 mt-1">
                <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="space-y-2">
            {items.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4 italic">Ton sac est vide. Commence ta liste !</p>
            ) : (
              items.map(item => (
                <div key={item.id} className={`flex items-center justify-between p-3 border rounded-xl transition-all ${item.packed ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200 shadow-sm hover:border-blue-300'}`}>
                  <div className="flex items-center gap-3 overflow-hidden cursor-pointer flex-1" onClick={() => toggleItem(item.id)}>
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${item.packed ? 'bg-blue-500 border-blue-500' : 'bg-white border-slate-300'}`}>
                      {item.packed && <CheckSquare size={14} className="text-white" />}
                    </div>
                    <span className={`text-sm truncate transition-all ${item.packed ? 'text-slate-400 line-through' : 'text-slate-700 font-medium'}`}>
                      {item.text}
                    </span>
                  </div>
                  <button onClick={() => deleteItem(item.id)} className="text-slate-400 hover:text-red-500 p-1.5 rounded-full hover:bg-red-50 ml-2 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <form onSubmit={handleAdd} className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2">
          <input type="text" placeholder="Ex: Passeport, Crème solaire..." value={newItem} onChange={(e) => setNewItem(e.target.value)} className="flex-1 border border-slate-200 bg-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500 shadow-sm" />
          <button type="submit" disabled={!newItem.trim()} className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 disabled:bg-slate-300 transition-colors flex items-center gap-2 font-medium text-sm shadow-sm">
            <PlusCircle size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}