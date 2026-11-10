import { ArrowRight, Hotel, Plus, Sun } from "lucide-react";
import { formatShortDate } from "../utils/dates";
import { formatEuros } from "../utils/currency";
import { getStepEstimatedTotal, getStepPaidTotal } from "../utils/budget";

const STATUS_LABEL = {
  A_RESERVER: {
    label: "À réserver",
    className: "bg-amber-400/20 text-amber-200",
  },
  RESERVE: { label: "Réservé", className: "bg-sky-400/20 text-sky-200" },
  PAYE: { label: "Payé", className: "bg-emerald-400/20 text-emerald-200" },
};

const firstLine = (text) => (text || "").split("\n")[0].trim();

// Carte "Aujourd'hui" : l'étape en cours, où l'on dort, ce qui vient
// ensuite, et les deux gestes les plus fréquents en voyage.
export default function TodayCard({
  progress,
  steps,
  onOpenStep,
  onQuickAdd,
}) {
  if (progress.status === "before") {
    return (
      <div className="rounded-[28px] bg-slate-900 p-5 text-white shadow-lg dark:bg-slate-800">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-300">
          Avant le départ
        </p>
        <p className="mt-2 text-2xl font-black tracking-tight">
          Départ dans {progress.daysUntilStart} jour
          {progress.daysUntilStart > 1 ? "s" : ""}
        </p>
      </div>
    );
  }
  if (progress.status !== "ongoing") return null;

  const { current, excursion, next, dayInStep, nightsLeft } = progress;
  const branch = steps.filter(
    (s) => s.id === current.id || s.parent_id === current.id,
  );
  const paid = branch.reduce((acc, s) => acc + getStepPaidTotal(s), 0);
  const estimated = branch.reduce(
    (acc, s) => acc + getStepEstimatedTotal(s),
    0,
  );
  const lodging = firstLine((excursion || current).lodging_info);
  const lodgingStatus =
    STATUS_LABEL[(excursion || current).lodging_status] ||
    STATUS_LABEL.A_RESERVER;
  const nextTransport = firstLine(next?.transport_info);
  const today = new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date());

  return (
    <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950 text-white shadow-[0_24px_60px_-30px_rgba(2,132,199,0.55)] print:hidden">
      <button
        type="button"
        onClick={() => onOpenStep(excursion || current)}
        className="block w-full p-5 text-left">
        <div className="flex items-center justify-between gap-3 whitespace-nowrap text-[11px] font-bold uppercase tracking-wide">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-sky-300">
            <Sun size={14} className="shrink-0" />
            <span className="truncate">Aujourd’hui · {today}</span>
          </span>
          <span className="shrink-0 text-slate-400">
            Jour {progress.tripDay}/{progress.tripTotalDays}
          </span>
        </div>

        <h2 className="mt-3 text-2xl font-black leading-tight tracking-tight">
          {current.city}
        </h2>
        <p className="mt-1 text-sm font-medium text-slate-300">
          {excursion && (
            <span className="font-bold text-white">{excursion.city} · </span>
          )}
          {current.country} · jour {dayInStep}
          {nightsLeft > 1 && ` · encore ${nightsLeft} nuits`}
          {nightsLeft === 1 && " · dernière nuit, départ demain"}
        </p>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-2.5">
            <Hotel size={18} className="shrink-0 text-orange-300" />
            <span className="line-clamp-2 min-w-0 flex-1 font-semibold">
              {lodging || "Hébergement à définir"}
            </span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${lodgingStatus.className}`}>
              {lodgingStatus.label}
            </span>
          </div>
          {next && (
            <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-2.5">
              <ArrowRight size={18} className="shrink-0 text-sky-300" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">
                  Ensuite : {next.city} ·{" "}
                  {formatShortDate(next.computedStartDate)}
                </span>
                {nextTransport && (
                  <span className="line-clamp-2 text-xs text-slate-400">
                    {nextTransport}
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      </button>

      <div className="flex items-center gap-3 border-t border-white/10 px-5 py-3">
        <p className="min-w-0 flex-1 text-xs font-medium text-slate-300">
          Dépensé ici :{" "}
          <span className="font-black text-white">{formatEuros(paid)}</span>
          {estimated > 0 && <> sur {formatEuros(estimated)}</>}
        </p>
        {onQuickAdd && (
          <button
            type="button"
            onClick={() => onQuickAdd(current.id)}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-sky-500 px-4 text-sm font-black text-white shadow-sm active:scale-95">
            <Plus size={18} strokeWidth={2.5} /> Dépense
          </button>
        )}
      </div>
    </div>
  );
}
