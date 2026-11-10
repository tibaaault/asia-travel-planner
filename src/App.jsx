import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Eye,
  MapPinned,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Timeline from "./components/Timeline";
import PreparationPage from "./components/PreparationPage";
import MobileNav from "./components/MobileNav";
import MorePage from "./components/MorePage";
import QuickAddSheet from "./components/QuickAddSheet";
import BackpackModal from "./components/BackpackModal";
import { supabase } from "./config/supabaseClient";
import { useSteps } from "./hooks/useSteps";
import { computeStepDates, getTripProgress } from "./utils/dates";
import { formatEuros } from "./utils/currency";
import { createId } from "./utils/ids";

const VIEW_TITLES = {
  itinerary: "Itinéraire",
  map: "Carte",
  preparation: "Budget",
  more: "Plus",
};

function App() {
  const [activeView, setActiveView] = useState("itinerary");
  // Session levée ici (plutôt que dans Timeline uniquement) pour que la
  // page Préparation connaisse elle aussi le mode visiteur/admin.
  const [session, setSession] = useState(null);
  // Les étapes sont chargées une seule fois ici et partagées entre les
  // vues : changer d'onglet ne relance plus de chargement.
  const trip = useSteps();
  const [isBackpackOpen, setIsBackpackOpen] = useState(false);
  // null = fermé ; sinon { stepId } de l'étape proposée par défaut
  const [quickAdd, setQuickAdd] = useState(null);
  const [toast, setToast] = useState("");
  // Date du jour, rafraîchie au retour sur l'app : une PWA peut rester
  // ouverte plusieurs jours, "aujourd'hui" ne doit pas rester figé.
  const [today, setToday] = useState(() => new Date());

  const isReadOnly = !session;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const refreshDay = () =>
      setToday((previous) => {
        const now = new Date();
        return now.toDateString() === previous.toDateString() ? previous : now;
      });
    document.addEventListener("visibilitychange", refreshDay);
    window.addEventListener("focus", refreshDay);
    return () => {
      document.removeEventListener("visibilitychange", refreshDay);
      window.removeEventListener("focus", refreshDay);
    };
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const stepsWithDates = useMemo(
    () => computeStepDates(trip.steps, trip.tripStartDate),
    [trip.steps, trip.tripStartDate],
  );
  const progress = useMemo(
    () => getTripProgress(stepsWithDates, today),
    [stepsWithDates, today],
  );

  const changeView = (view) => {
    setActiveView(view);
    window.scrollTo({ top: 0 });
  };

  const openQuickAdd = useCallback(
    (stepId) => {
      const fallbackId =
        progress.status === "ongoing"
          ? progress.current.id
          : stepsWithDates[progress.status === "after" ? stepsWithDates.length - 1 : 0]?.id;
      setQuickAdd({ stepId: stepId || fallbackId || "" });
    },
    [progress, stepsWithDates],
  );
  const closeQuickAdd = useCallback(() => setQuickAdd(null), []);

  const handleQuickAdd = async ({ stepId, title, amountEur, note }) => {
    const step = trip.steps.find((s) => s.id === stepId);
    if (!step) return;
    const activity = {
      id: createId(),
      title,
      place: "",
      notes: note,
      estimatedPrice: 0,
      price: amountEur,
      lat: null,
      lng: null,
    };
    await trip.appendActivity(stepId, activity);
    setQuickAdd(null);
    setToast(`${formatEuros(amountEur)} ajoutés à ${step.city}`);
  };

  const handlePrint = () => {
    // L'export imprime l'itinéraire : on s'assure qu'il est à l'écran.
    setActiveView("itinerary");
    setTimeout(() => window.print(), 300);
  };

  const viewButtonClass = (isActive) =>
    `inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${isActive ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20" : "text-slate-300 hover:text-white"}`;

  return (
    <div className="safe-x relative min-h-screen overflow-x-clip bg-transparent text-slate-900 dark:text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden print:hidden">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-sky-400/18 blur-3xl" />
        <div className="absolute right-0 top-28 h-80 w-80 rounded-full bg-emerald-400/12 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-blue-300/8 blur-3xl" />
      </div>

      <header className="relative z-10 w-full bg-slate-950 text-white print:hidden dark:border-b dark:border-white/5 dark:bg-slate-950/70">
        <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:px-6 xl:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-sky-300">
              <Sparkles size={18} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 sm:tracking-[0.22em]">
                Asia Travel Planner
              </p>
              <h1 className="truncate text-lg font-black leading-tight tracking-tight lg:hidden">
                {VIEW_TITLES[activeView]}
              </h1>
              <p className="hidden text-base font-black leading-tight tracking-tight lg:block">
                Organise ton voyage, sans t’éparpiller
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden rounded-2xl bg-slate-900 p-1.5 shadow-inner shadow-black/25 lg:inline-flex">
              <button
                type="button"
                onClick={() => changeView("itinerary")}
                className={viewButtonClass(activeView !== "preparation")}>
                <MapPinned size={16} /> Itinéraire
              </button>
              <button
                type="button"
                onClick={() => changeView("preparation")}
                className={viewButtonClass(activeView === "preparation")}>
                <ClipboardList size={16} /> Préparation
              </button>
            </div>
            <button
              type="button"
              onClick={() => changeView("more")}
              title={isReadOnly ? "Se connecter" : "Compte"}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-[11px] font-bold uppercase tracking-wider lg:pointer-events-none ${isReadOnly ? "border-white/15 bg-white/5 text-slate-300" : "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"}`}>
              {isReadOnly ? <Eye size={14} /> : <ShieldCheck size={14} />}
              {isReadOnly ? "Visiteur" : "Admin"}
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1680px] px-4 pb-28 pt-4 md:px-6 md:pt-6 lg:pb-10 xl:px-8">
        {activeView === "preparation" ? (
          <PreparationPage
            session={session}
            trip={trip}
            progress={progress}
            onBackToItinerary={() => changeView("itinerary")}
            onQuickAdd={isReadOnly ? undefined : openQuickAdd}
          />
        ) : activeView === "more" ? (
          <MorePage
            session={session}
            tripStartDate={trip.tripStartDate}
            onChangeStartDate={trip.updateTripStartDate}
            onOpenBackpack={() => setIsBackpackOpen(true)}
            onPrint={handlePrint}
          />
        ) : (
          <Timeline
            session={session}
            trip={trip}
            stepsWithDates={stepsWithDates}
            progress={progress}
            mobileView={activeView === "map" ? "map" : "list"}
            onOpenBackpack={() => setIsBackpackOpen(true)}
            onQuickAdd={isReadOnly ? undefined : openQuickAdd}
          />
        )}
      </main>

      <MobileNav
        activeView={activeView}
        onChange={changeView}
        onQuickAdd={isReadOnly ? undefined : () => openQuickAdd()}
      />

      {quickAdd && (
        <QuickAddSheet
          steps={stepsWithDates}
          defaultStepId={quickAdd.stepId}
          onSubmit={handleQuickAdd}
          onClose={closeQuickAdd}
        />
      )}

      {isBackpackOpen && (
        <BackpackModal session={session} onClose={() => setIsBackpackOpen(false)} />
      )}

      {toast && (
        <div
          role="status"
          className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex justify-center px-4 print:hidden lg:bottom-8">
          <div className="animate-modal-pop inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-xl dark:bg-white dark:text-slate-900">
            <CheckCircle2 size={18} className="text-emerald-400 dark:text-emerald-600" />
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
