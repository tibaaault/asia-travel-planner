import { Wallet, Globe2, CalendarDays, Map } from 'lucide-react';

export default function TripSummary({ steps }) {
  // Calculs automatiques
  const totalBudget = steps.reduce((acc, step) => acc + (Number(step.budget_estimated) || 0), 0);
  const totalSpent = steps.reduce((acc, step) => acc + (Number(step.budget_spent) || 0), 0);
  const totalDays = steps.reduce((acc, step) => acc + (Number(step.duration) || 0), 0);
  const uniqueCountries = new Set(steps.map(step => step.country)).size;
  const totalSteps = steps.length;

  // Calcul pour la jauge
  const isOverBudget = totalSpent > totalBudget && totalBudget > 0;
  const progressColor = isOverBudget ? 'bg-red-500' : 'bg-emerald-500';
  const progressWidth = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-6 w-full">
      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
        Vue d'ensemble du voyage
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex flex-col items-center justify-center text-center">
          <CalendarDays size={24} className="text-blue-500 mb-1" />
          <span className="text-2xl font-bold text-blue-700">{totalDays}</span>
          <span className="text-xs font-medium text-blue-600 uppercase tracking-wider">Jours</span>
        </div>

        <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 flex flex-col items-center justify-center text-center">
          <Map size={24} className="text-orange-500 mb-1" />
          <span className="text-2xl font-bold text-orange-700">{totalSteps}</span>
          <span className="text-xs font-medium text-orange-600 uppercase tracking-wider">Étapes</span>
        </div>

        <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 flex flex-col items-center justify-center text-center">
          <Globe2 size={24} className="text-purple-500 mb-1" />
          <span className="text-2xl font-bold text-purple-700">{uniqueCountries}</span>
          <span className="text-xs font-medium text-purple-600 uppercase tracking-wider">Pays</span>
        </div>

        <div className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center ${isOverBudget ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-100'}`}>
          <Wallet size={24} className={`${isOverBudget ? 'text-red-500' : 'text-emerald-500'} mb-1`} />
          <span className={`text-2xl font-bold ${isOverBudget ? 'text-red-700' : 'text-emerald-700'}`}>
            {totalSpent}€ <span className={`text-sm font-medium ${isOverBudget ? 'text-red-400' : 'text-emerald-600/70'}`}>/ {totalBudget}€</span>
          </span>
          <span className={`text-xs font-medium uppercase tracking-wider ${isOverBudget ? 'text-red-600' : 'text-emerald-600'}`}>Dépensé</span>
        </div>
      </div>

      {/* La Jauge de progression */}
      {totalBudget > 0 && (
        <div className="mt-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
          <div className="flex justify-between text-xs font-medium text-gray-500 mb-2">
            <span>Progression du budget global</span>
            <span className={isOverBudget ? 'text-red-500 font-bold' : 'text-emerald-600'}>
              {Math.round((totalSpent / totalBudget) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div className={`h-2.5 rounded-full transition-all duration-1000 ${progressColor}`} style={{ width: `${progressWidth}%` }}></div>
          </div>
        </div>
      )}
    </div>
  );
}