import { useState } from 'react';
import { PlusCircle, Loader2 } from 'lucide-react';

export default function AddStepForm({ onAddStep }) {
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [duration, setDuration] = useState('');
  const [isSearching, setIsSearching] = useState(false); // État de chargement

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!city || !country || !duration) return;

    setIsSearching(true);
    let lat = null;
    let lng = null;

    try {
      // Magie : On demande les coordonnées à OpenStreetMap !
      const response = await fetch(`https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&format=json`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        lat = parseFloat(data[0].lat);
        lng = parseFloat(data[0].lon); // L'API s'en sert sous le nom "lon"
      }
    } catch (error) {
      console.error("Erreur lors de la recherche des coordonnées :", error);
    }

    const newStep = {
      city,
      country,
      duration: parseInt(duration, 10),
      lat,
      lng
    };

    await onAddStep(newStep);

    setCity('');
    setCountry('');
    setDuration('');
    setIsSearching(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
      <h3 className="font-semibold text-gray-800 mb-4">Nouvelle Étape</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <input 
          type="text" 
          placeholder="Ville (ex: Hanoï)" 
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:border-blue-500"
        />
        <input 
          type="text" 
          placeholder="Pays (ex: Vietnam)" 
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:border-blue-500"
        />
        <input 
          type="number" 
          placeholder="Durée (jours)" 
          min="1"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:border-blue-500"
        />
      </div>

      <button 
        type="submit" 
        disabled={isSearching}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors cursor-pointer"
      >
        {isSearching ? <Loader2 size={20} className="animate-spin" /> : <PlusCircle size={20} />}
        {isSearching ? "Localisation de la ville..." : "Ajouter à l'itinéraire"}
      </button>
    </form>
  );
}