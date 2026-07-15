import { Wallet, Globe2, CalendarDays, Map } from 'lucide-react';

export default function TripSummary({ steps }) {
  // Calculs automatiques basés sur tes étapes
  const totalBudget = steps.reduce((acc, step) => acc + (Number(step.budget_estimated) || 0), 0);
  const totalDays = steps.reduce((acc, step) => acc + (Number(step.duration) || 0), 0);
  const uniqueCountries = new Set(steps.map(step => step.country)).size;
  const totalSteps = steps.length;

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-6 w-full">
      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
        Vue d'ensemble du voyage
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Jours au total */}
        <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex flex-col items-center justify-center text-center">
          <CalendarDays size={24} className="text-blue-500 mb-1" />
          <span className="text-2xl font-bold text-blue-700">{totalDays}</span>
          <span className="text-xs font-medium text-blue-600 uppercase tracking-wider">Jours</span>
        </div>

        {/* Étapes */}
        <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 flex flex-col items-center justify-center text-center">
          <Map size={24} className="text-orange-500 mb-1" />
          <span className="text-2xl font-bold text-orange-700">{totalSteps}</span>
          <span className="text-xs font-medium text-orange-600 uppercase tracking-wider">Étapes</span>
        </div>

        {/* Pays visités */}
        <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 flex flex-col items-center justify-center text-center">
          <Globe2 size={24} className="text-purple-500 mb-1" />
          <span className="text-2xl font-bold text-purple-700">{uniqueCountries}</span>
          <span className="text-xs font-medium text-purple-600 uppercase tracking-wider">Pays</span>
        </div>

        {/* Budget Total */}
        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 flex flex-col items-center justify-center text-center">
          <Wallet size={24} className="text-emerald-500 mb-1" />
          <span className="text-2xl font-bold text-emerald-700">{totalBudget}€</span>
          <span className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Budget Est.</span>
        </div>
      </div>
    </div>
  );
}