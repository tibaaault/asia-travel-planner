import { Backpack, ChevronRight, PlaneTakeoff, Printer } from "lucide-react";
import Auth from "./Auth";
import { fieldLabelClass } from "../utils/ui";

// Onglet "Plus" du téléphone : tout ce qui sert rarement (compte, date de
// départ, sac à dos, export) pour ne pas encombrer l'itinéraire.
export default function MorePage({
  session,
  tripStartDate,
  onChangeStartDate,
  onOpenBackpack,
  onPrint,
}) {
  const isReadOnly = !session;
  const cardClass =
    "rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/85";
  const rowClass =
    "flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 text-left text-base font-bold text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800";

  return (
    <div className="mx-auto max-w-lg space-y-4 py-4">
      <div className={cardClass}>
        <p className={fieldLabelClass}>Compte</p>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
          {isReadOnly
            ? "Tu consultes le voyage en lecture seule. Connecte-toi pour le modifier."
            : "Tu es connecté : tu peux modifier le voyage."}
        </p>
        <Auth session={session} />
      </div>

      <div className={cardClass}>
        <label htmlFor="trip-start-date" className={fieldLabelClass}>
          Date de départ du voyage
        </label>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 dark:border-slate-700 dark:bg-slate-950/60">
          <PlaneTakeoff size={18} className="shrink-0 text-slate-400" />
          <input
            id="trip-start-date"
            type="date"
            value={tripStartDate}
            onChange={(e) => onChangeStartDate(e.target.value)}
            disabled={isReadOnly}
            className="min-h-12 w-full bg-transparent text-base font-bold text-slate-700 outline-none dark:text-slate-200"
          />
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Toutes les dates des étapes sont calculées à partir de celle-ci.
        </p>
      </div>

      <div className={`${cardClass} !p-2`}>
        <button type="button" onClick={onOpenBackpack} className={rowClass}>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <Backpack size={20} />
          </span>
          <span className="flex-1">Sac à dos</span>
          <ChevronRight size={20} className="text-slate-300" />
        </button>
        <button
          type="button"
          onClick={onPrint}
          className={rowClass}>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <Printer size={20} />
          </span>
          <span className="flex-1">Exporter / imprimer l’itinéraire</span>
          <ChevronRight size={20} className="text-slate-300" />
        </button>
      </div>
    </div>
  );
}
