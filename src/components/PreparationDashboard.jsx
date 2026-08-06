import { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient'; // Vérifie le chemin selon ton arborescence
import { Trash2, Plus, CheckCircle, Circle, Plane, FileText } from 'lucide-react';

export default function PreparationDashboard({ session }) {
  const [activeTab, setActiveTab] = useState('expenses'); // 'expenses' ou 'logistics'
  const [expenses, setExpenses] = useState([]);
  const [logistics, setLogistics] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const isReadOnly = !session;

  // États pour la ligne d'ajout rapide (Dépenses)
  const [newExpCategory, setNewExpCategory] = useState('Billet');
  const [newExpName, setNewExpName] = useState('');
  const [newExpAmount, setNewExpAmount] = useState('');

  // États pour la ligne d'ajout rapide (Logistique)
  const [newLogType, setNewLogType] = useState('Visa');
  const [newLogCountry, setNewLogCountry] = useState('');
  const [newLogDesc, setNewLogDesc] = useState('');
  const [newLogCost, setNewLogCost] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const [expRes, logRes] = await Promise.all([
      supabase.from('prep_expenses').select('*').order('created_at', { ascending: true }),
      supabase.from('prep_logistics').select('*').order('created_at', { ascending: true })
    ]);

    if (!expRes.error) setExpenses(expRes.data);
    if (!logRes.error) setLogistics(logRes.data);
    setIsLoading(false);
  };

  // ==========================================
  // GESTION DES DÉPENSES
  // ==========================================
  const addExpense = async (e) => {
    e.preventDefault();
    if (isReadOnly || !newExpName) return;

    const { data, error } = await supabase.from('prep_expenses').insert([{
      category: newExpCategory,
      name: newExpName,
      amount: parseFloat(newExpAmount) || 0
    }]).select().single();

    if (!error && data) {
      setExpenses([...expenses, data]);
      setNewExpName('');
      setNewExpAmount('');
    }
  };

  // Mise à jour à la volée (Inline Editing)
  const handleExpenseChange = (id, field, value) => {
    setExpenses(expenses.map(exp => exp.id === id ? { ...exp, [field]: value } : exp));
  };

  const saveExpenseToDB = async (id, field, value) => {
    if (isReadOnly) return;
    
    // Conversion en nombre si c'est le montant
    const finalValue = field === 'amount' ? (parseFloat(value) || 0) : value;
    await supabase.from('prep_expenses').update({ [field]: finalValue }).eq('id', id);
  };

  const toggleExpensePaid = async (id, currentStatus) => {
    if (isReadOnly) return;
    setExpenses(expenses.map(e => e.id === id ? { ...e, is_paid: !currentStatus } : e));
    await supabase.from('prep_expenses').update({ is_paid: !currentStatus }).eq('id', id);
  };

  const deleteExpense = async (id) => {
    if (isReadOnly) return;
    setExpenses(expenses.filter(e => e.id !== id));
    await supabase.from('prep_expenses').delete().eq('id', id);
  };

  // ==========================================
  // GESTION DE LA LOGISTIQUE
  // ==========================================
  const addLogistic = async (e) => {
    e.preventDefault();
    if (isReadOnly || !newLogDesc) return;

    const { data, error } = await supabase.from('prep_logistics').insert([{
      type: newLogType,
      country: newLogCountry,
      description: newLogDesc,
      cost: parseFloat(newLogCost) || 0
    }]).select().single();

    if (!error && data) {
      setLogistics([...logistics, data]);
      setNewLogDesc('');
      setNewLogCountry('');
      setNewLogCost('');
    }
  };

  // Mise à jour à la volée (Inline Editing)
  const handleLogisticChange = (id, field, value) => {
    setLogistics(logistics.map(log => log.id === id ? { ...log, [field]: value } : log));
  };

  const saveLogisticToDB = async (id, field, value) => {
    if (isReadOnly) return;
    const finalValue = field === 'cost' ? (parseFloat(value) || 0) : value;
    await supabase.from('prep_logistics').update({ [field]: finalValue }).eq('id', id);
  };

  const deleteLogistic = async (id) => {
    if (isReadOnly) return;
    setLogistics(logistics.filter(l => l.id !== id));
    await supabase.from('prep_logistics').delete().eq('id', id);
  };

  // ==========================================
  // CALCULS (Mise à jour en temps réel)
  // ==========================================
  const totalExpenses = expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const totalPaid = expenses.filter(e => e.is_paid).reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const totalLogistics = logistics.reduce((acc, curr) => acc + Number(curr.cost || 0), 0);

  // Styles mutualisés pour les cellules Excel-like
  const inputStyle = "w-full bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-700 rounded px-2 py-1 transition-all text-slate-800 dark:text-slate-200";

  return (
    <div className="w-full animate-fade-in">
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden backdrop-blur-sm">
        
        {/* EN-TÊTE ET ONGLETS */}
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <button 
            onClick={() => setActiveTab('expenses')}
            className={`flex-1 p-4 font-semibold flex items-center justify-center gap-2 transition-colors ${activeTab === 'expenses' ? 'bg-blue-50/80 text-blue-600 border-b-2 border-blue-600 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
          >
            <Plane size={20} /> Budget Préparatoire
          </button>
          <button 
            onClick={() => setActiveTab('logistics')}
            className={`flex-1 p-4 font-semibold flex items-center justify-center gap-2 transition-colors ${activeTab === 'logistics' ? 'bg-emerald-50/80 text-emerald-600 border-b-2 border-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
          >
            <FileText size={20} /> Administratif & Santé
          </button>
        </div>

        {/* CONTENU */}
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-10 text-slate-500 flex flex-col items-center gap-2">
               <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
               Chargement du tableur...
            </div>
          ) : activeTab === 'expenses' ? (
            
            /* VUE TABLEUR : DÉPENSES */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700 w-1/4">Catégorie</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700 w-1/3">Désignation</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700 w-32">Montant (€)</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700 w-24 text-center">Payé</th>
                    {!isReadOnly && <th className="p-3 border-b border-slate-200 dark:border-slate-700 w-12"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {expenses.map(exp => (
                    <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors group">
                      <td className="p-1.5 border-r border-slate-100 dark:border-slate-800/50">
                        {isReadOnly ? (
                          <div className="px-2 py-1 text-sm text-slate-700 dark:text-slate-300">{exp.category}</div>
                        ) : (
                          <select 
                            value={exp.category}
                            onChange={(e) => handleExpenseChange(exp.id, 'category', e.target.value)}
                            onBlur={(e) => saveExpenseToDB(exp.id, 'category', e.target.value)}
                            className={`${inputStyle} text-sm`}
                          >
                            <option>Billet</option>
                            <option>Assurance</option>
                            <option>Équipement</option>
                            <option>Hébergement</option>
                            <option>Autre</option>
                          </select>
                        )}
                      </td>
                      <td className="p-1.5 border-r border-slate-100 dark:border-slate-800/50">
                        {isReadOnly ? (
                          <div className="px-2 py-1 text-sm font-medium text-slate-800 dark:text-slate-200">{exp.name}</div>
                        ) : (
                          <input 
                            type="text" 
                            value={exp.name}
                            onChange={(e) => handleExpenseChange(exp.id, 'name', e.target.value)}
                            onBlur={(e) => saveExpenseToDB(exp.id, 'name', e.target.value)}
                            className={`${inputStyle} font-medium text-sm`}
                          />
                        )}
                      </td>
                      <td className="p-1.5 border-r border-slate-100 dark:border-slate-800/50">
                        {isReadOnly ? (
                          <div className="px-2 py-1 text-sm text-slate-700 dark:text-slate-300">{exp.amount}</div>
                        ) : (
                          <input 
                            type="number" 
                            value={exp.amount}
                            onChange={(e) => handleExpenseChange(exp.id, 'amount', e.target.value)}
                            onBlur={(e) => saveExpenseToDB(exp.id, 'amount', e.target.value)}
                            className={`${inputStyle} text-sm font-mono`}
                          />
                        )}
                      </td>
                      <td className="p-1.5 text-center">
                        <button 
                          onClick={() => toggleExpensePaid(exp.id, exp.is_paid)}
                          disabled={isReadOnly}
                          className={`${exp.is_paid ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'} ${isReadOnly ? 'cursor-default' : 'hover:scale-110 transition-transform'}`}
                        >
                          {exp.is_paid ? <CheckCircle size={20} className="mx-auto" /> : <Circle size={20} className="mx-auto" />}
                        </button>
                      </td>
                      {!isReadOnly && (
                        <td className="p-1.5 text-center">
                          <button onClick={() => deleteExpense(exp.id)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 size={16} className="mx-auto" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  
                  {/* LIGNE D'AJOUT RAPIDE */}
                  {!isReadOnly && (
                    <tr className="bg-blue-50/30 dark:bg-blue-900/10">
                      <td className="p-2">
                        <select value={newExpCategory} onChange={e => setNewExpCategory(e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded p-1.5 text-sm">
                          <option>Billet</option>
                          <option>Assurance</option>
                          <option>Équipement</option>
                          <option>Hébergement</option>
                          <option>Autre</option>
                        </select>
                      </td>
                      <td className="p-2">
                        <input type="text" placeholder="Ajouter une dépense..." value={newExpName} onChange={e => setNewExpName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addExpense(e)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded p-1.5 text-sm" />
                      </td>
                      <td className="p-2">
                        <input type="number" placeholder="0" value={newExpAmount} onChange={e => setNewExpAmount(e.target.value)} onKeyDown={e => e.key === 'Enter' && addExpense(e)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded p-1.5 text-sm font-mono" />
                      </td>
                      <td className="p-2"></td>
                      <td className="p-2 text-center">
                        <button onClick={addExpense} className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded flex items-center justify-center w-full transition-colors">
                          <Plus size={16} />
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* RÉSUMÉ BUDGET */}
              <div className="mt-6 flex justify-end gap-4 text-sm">
                <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 p-4 rounded-xl min-w-[150px]">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1 text-xs uppercase tracking-wider">Total estimé</span>
                  <span className="text-2xl font-black text-slate-800 dark:text-white">{totalExpenses} <span className="text-lg text-slate-400">€</span></span>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 p-4 rounded-xl min-w-[150px]">
                  <span className="text-emerald-600 dark:text-emerald-400 block mb-1 text-xs uppercase tracking-wider">Déjà payé</span>
                  <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{totalPaid} <span className="text-lg text-emerald-500/50">€</span></span>
                </div>
              </div>
            </div>

          ) : (

            /* VUE TABLEUR : LOGISTIQUE */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700 w-1/5">Type</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700 w-1/4">Pays concerné</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700 w-1/3">Description</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700 w-24">Coût (€)</th>
                    {!isReadOnly && <th className="p-3 border-b border-slate-200 dark:border-slate-700 w-12"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {logistics.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors group">
                      <td className="p-1.5 border-r border-slate-100 dark:border-slate-800/50">
                        {isReadOnly ? (
                          <div className="px-2 py-1 text-sm font-medium text-slate-800 dark:text-slate-200">{log.type}</div>
                        ) : (
                          <select 
                            value={log.type}
                            onChange={(e) => handleLogisticChange(log.id, 'type', e.target.value)}
                            onBlur={(e) => saveLogisticToDB(log.id, 'type', e.target.value)}
                            className={`${inputStyle} text-sm font-medium`}
                          >
                            <option>Visa</option>
                            <option>Vaccin</option>
                            <option>Passeport</option>
                            <option>Permis/International</option>
                            <option>Autre</option>
                          </select>
                        )}
                      </td>
                      <td className="p-1.5 border-r border-slate-100 dark:border-slate-800/50">
                        {isReadOnly ? (
                          <div className="px-2 py-1 text-sm text-slate-500 dark:text-slate-400">{log.country || '-'}</div>
                        ) : (
                          <input 
                            type="text" 
                            value={log.country || ''}
                            onChange={(e) => handleLogisticChange(log.id, 'country', e.target.value)}
                            onBlur={(e) => saveLogisticToDB(log.id, 'country', e.target.value)}
                            className={`${inputStyle} text-sm`}
                            placeholder="Ex: Vietnam"
                          />
                        )}
                      </td>
                      <td className="p-1.5 border-r border-slate-100 dark:border-slate-800/50">
                        {isReadOnly ? (
                          <div className="px-2 py-1 text-sm text-slate-800 dark:text-slate-200">{log.description}</div>
                        ) : (
                          <input 
                            type="text" 
                            value={log.description}
                            onChange={(e) => handleLogisticChange(log.id, 'description', e.target.value)}
                            onBlur={(e) => saveLogisticToDB(log.id, 'description', e.target.value)}
                            className={`${inputStyle} text-sm`}
                          />
                        )}
                      </td>
                      <td className="p-1.5 border-r border-slate-100 dark:border-slate-800/50">
                        {isReadOnly ? (
                          <div className="px-2 py-1 text-sm text-slate-800 dark:text-slate-200">{log.cost}</div>
                        ) : (
                          <input 
                            type="number" 
                            value={log.cost}
                            onChange={(e) => handleLogisticChange(log.id, 'cost', e.target.value)}
                            onBlur={(e) => saveLogisticToDB(log.id, 'cost', e.target.value)}
                            className={`${inputStyle} text-sm font-mono`}
                          />
                        )}
                      </td>
                      {!isReadOnly && (
                        <td className="p-1.5 text-center">
                          <button onClick={() => deleteLogistic(log.id)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 size={16} className="mx-auto" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}

                  {/* LIGNE D'AJOUT RAPIDE */}
                  {!isReadOnly && (
                    <tr className="bg-emerald-50/30 dark:bg-emerald-900/10">
                      <td className="p-2">
                        <select value={newLogType} onChange={e => setNewLogType(e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded p-1.5 text-sm">
                          <option>Visa</option>
                          <option>Vaccin</option>
                          <option>Passeport</option>
                          <option>Permis/International</option>
                          <option>Autre</option>
                        </select>
                      </td>
                      <td className="p-2">
                        <input type="text" placeholder="Ex: Indonésie" value={newLogCountry} onChange={e => setNewLogCountry(e.target.value)} onKeyDown={e => e.key === 'Enter' && addLogistic(e)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded p-1.5 text-sm" />
                      </td>
                      <td className="p-2">
                        <input type="text" placeholder="Ex: E-VOA 60 jours" value={newLogDesc} onChange={e => setNewLogDesc(e.target.value)} onKeyDown={e => e.key === 'Enter' && addLogistic(e)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded p-1.5 text-sm" />
                      </td>
                      <td className="p-2">
                        <input type="number" placeholder="0" value={newLogCost} onChange={e => setNewLogCost(e.target.value)} onKeyDown={e => e.key === 'Enter' && addLogistic(e)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded p-1.5 text-sm font-mono" />
                      </td>
                      <td className="p-2 text-center">
                        <button onClick={addLogistic} className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded flex items-center justify-center w-full transition-colors">
                          <Plus size={16} />
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="mt-6 flex justify-end">
                <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 p-4 rounded-xl min-w-[150px]">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1 text-xs uppercase tracking-wider">Total Administratif</span>
                  <span className="text-2xl font-black text-slate-800 dark:text-white">{totalLogistics} <span className="text-lg text-slate-400">€</span></span>
                </div>
              </div>
            </div>

          )}
        </div>
      </div>
    </div>
  );
}