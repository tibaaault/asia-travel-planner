import { useState } from 'react';
import { supabase } from '../config/supabaseClient';
import { Lock, LogOut, Loader2 } from 'lucide-react';

export default function Auth({ session }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Erreur de connexion : " + error.message);
    setLoading(false);
  };

  const handleLogout = () => supabase.auth.signOut();

  // Si on est connecté, on affiche juste le bouton déconnexion
  if (session) {
    return (
      <button onClick={handleLogout} className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-red-500 transition-colors cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
        <LogOut size={14} /> Déconnexion
      </button>
    );
  }

  // Sinon, le mini formulaire de connexion
  return (
    <form onSubmit={handleLogin} className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-gray-200 shadow-sm">
      <input 
        type="email" 
        placeholder="Email admin" 
        value={email} 
        onChange={e => setEmail(e.target.value)} 
        className="w-28 px-2 py-1 text-xs focus:outline-none bg-gray-50 rounded" 
      />
      <input 
        type="password" 
        placeholder="Mot de passe" 
        value={password} 
        onChange={e => setPassword(e.target.value)} 
        className="w-28 px-2 py-1 text-xs focus:outline-none bg-gray-50 rounded" 
      />
      <button type="submit" disabled={loading} className="bg-gray-800 text-white p-1.5 rounded hover:bg-gray-700 transition-colors cursor-pointer">
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
      </button>
    </form>
  );
}