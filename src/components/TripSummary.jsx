import { Wallet, Globe2, CalendarDays, Map, Navigation, ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatDaysNights } from "../utils/duration";
import {
  getTopLevelSteps,
  getTripEstimatedTotal,
  getTripPaidTotal,
} from "../utils/budget";

const VISA_INFO = {
  Thaïlande: { limit: 30, type: "Exemption" },
  Vietnam: { limit: 45, type: "E-visa" },
  Malaisie: { limit: 90, type: "Exemption" },
  Indonésie: { limit: 30, type: "VOA (Payant)" },
  Japon: { limit: 90, type: "Exemption" },
  Cambodge: { limit: 30, type: "E-visa / VOA" },
};

export default function TripSummary({ steps, visaStats, totalDistance = 0 }) {
  const travelSteps = getTopLevelSteps(steps);
  const totalBudget = getTripEstimatedTotal(steps);
  const totalSpent = getTripPaidTotal(steps);
  const totalDays = travelSteps.reduce((acc, step) => acc + (Number(step.duration) || 0), 0);
  const uniqueCountries = new Set(travelSteps.map((step) => step.country)).size;
  const totalSteps = steps.length;

  const isOverBudget = totalSpent > totalBudget && totalBudget > 0;
  const progressColor = isOverBudget ? "bg-red-500" : "bg-emerald-500";
  const progressWidth = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;

  const summaryCards = [
    {
      label: "Durée",
      value: formatDaysNights(totalDays, { compact: true }),
      icon: <CalendarDays size={18} />,
      colorClass: "text-blue-600 dark:text-blue-400",
      bgClass: "bg-blue-50 dark:bg-blue-500/10",
    },
    {
      label: "Étapes",
      value: totalSteps,
      icon: <Map size={18} />,
      colorClass: "text-amber-600 dark:text-amber-400",
      bgClass: "bg-amber-50 dark:bg-amber-500/10",
    },
    {
      label: "Pays",
      value: uniqueCountries,
      icon: <Globe2 size={18} />,
      colorClass: "text-violet-600 dark:text-violet-400",
      bgClass: "bg-violet-50 dark:bg-violet-500/10",
    },
    {
      label: "Dépensé",
      value: `${totalSpent.toLocaleString("fr-FR")} €`,
      icon: <Wallet size={18} />,
      colorClass: isOverBudget ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400",
      bgClass: isOverBudget ? "bg-red-50 dark:bg-red-500/10" : "bg-emerald-50 dark:bg-emerald-500/10",
    },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      
      {/* ========================================================================= */}
      {/* WIDGET 1 : APERÇU GLOBAL                                                  */}
      {/* ========================================================================= */}
      <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] backdrop-blur dark:border-slate-700 dark:bg-slate-900/85 sm:p-6">
        
        {/* En-tête du widget */}
        <div className="mb-5 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Globe2 size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
              Résumé du voyage
            </h3>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Aperçu global de ton itinéraire
            </p>
          </div>
        </div>

        {/* Grille de statistiques 2x2 */}
        <div className="grid grid-cols-2 gap-3">
          {summaryCards.map((card) => (
            <div key={card.label} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-950/40 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.bgClass} ${card.colorClass}`}>
                {card.icon}
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-black text-slate-900 dark:text-white leading-tight">
                  {card.value}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {card.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Bloc Distance (s'il y a plus d'une étape) */}
        {totalDistance > 0 && (
          <div className="mt-3 flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <Navigation size={16} className="text-blue-500" /> Distance estimée
            </div>
            <span className="font-black text-slate-900 dark:text-white">
              {totalDistance.toLocaleString("fr-FR")} km
            </span>
          </div>
        )}

        {/* Barre de progression Budget */}
        {totalBudget > 0 && (
          <div className="mt-5">
            <div className="mb-2 flex items-end justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Budget (Estimé : {totalBudget.toLocaleString("fr-FR")} €)
              </span>
              <span className={`text-sm font-black ${isOverBudget ? "text-red-500" : "text-emerald-500"}`}>
                {Math.round((totalSpent / totalBudget) * 100)}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${progressColor}`}
                style={{ width: `${progressWidth}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* WIDGET 2 : VISAS ET PASSEPORT                                             */}
      {/* ========================================================================= */}
      {visaStats && Object.keys(visaStats).length > 0 && (
        <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] backdrop-blur dark:border-slate-700 dark:bg-slate-900/85 sm:p-6">
          
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
              <ShieldCheck size={20} />
            </div>
            <h3 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
              Passeport & Visas
            </h3>
          </div>

          <div className="space-y-3">
            {Object.entries(visaStats).map(([country, days]) => {
              const info = VISA_INFO[country] || { limit: 30, type: "Visa requis" };
              const isOverLimit = days > info.limit;

              return (
                <div key={country} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                  <div>
                    <span className="block text-sm font-bold text-slate-900 dark:text-white">
                      {country}
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      {days} jours prévus
                    </span>
                  </div>

                  {isOverLimit ? (
                    <div className="flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-600 dark:bg-red-500/10 dark:text-red-400">
                      <AlertTriangle size={14} /> <span>Dépasse {info.limit}j</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end gap-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={14} /> <span>{info.type}</span>
                      </div>
                      <span className="text-[10px] font-medium text-slate-400">Max {info.limit}j</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="mt-4 rounded-xl bg-blue-50/50 p-3 text-xs font-medium text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30">
            Rappel : Ton passeport doit être valide au moins 6 mois après ta date de retour.
          </div>
        </div>
      )}
    </div>
  );
}