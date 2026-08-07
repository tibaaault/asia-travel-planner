import { useEffect, useState } from "react";
import { CalendarDays, ClipboardList, MapPinned, Sparkles } from "lucide-react";
import Timeline from "./components/Timeline";
import PreparationPage from "./components/PreparationPage";
import { supabase } from "./config/supabaseClient";

function App() {
  const [activeView, setActiveView] = useState("itinerary");
  // Session levée ici (plutôt que dans Timeline uniquement) pour que la
  // page Préparation connaisse elle aussi le mode visiteur/admin.
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-slate-900 dark:text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-sky-400/18 blur-3xl" />
        <div className="absolute right-0 top-28 h-80 w-80 rounded-full bg-emerald-400/12 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-blue-300/8 blur-3xl" />
      </div>
      <header className="relative z-10 w-full bg-slate-950/95 text-white shadow-[0_24px_80px_-40px_rgba(15,23,42,0.6)] backdrop-blur dark:bg-slate-950/70 dark:shadow-none dark:border-b dark:border-white/5">
        <div className="mx-auto max-w-[1680px]">
          <div className="bg-slate-900/80 px-4 py-4 shadow-[0_18px_50px_-30px_rgba(2,6,23,0.8)] backdrop-blur-sm sm:px-5 dark:bg-slate-900/40 dark:shadow-none">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-sky-300 shadow-inner shadow-black/10">
                  <Sparkles size={20} />
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
                      Asia Travel Planner
                    </p>
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300">
                      Voyage actif
                    </span>
                  </div>
                  <h1 className="text-base font-black tracking-tight text-white sm:text-lg">
                    Organise ton voyage, sans t’éparpiller
                  </h1>
                  <p className="max-w-2xl text-xs leading-5 text-slate-400 sm:text-sm">
                    Itinéraire pour la vue d’ensemble, préparation pour la
                    saisie détaillée, le tout synchronisé sur le même voyage.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <div className="inline-flex w-full rounded-2xl bg-slate-950/90 p-1.5 shadow-inner shadow-black/25 sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setActiveView("itinerary")}
                    className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition sm:flex-none ${activeView === "itinerary" ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20" : "text-slate-300 hover:text-white"}`}>
                    <MapPinned size={16} /> Itinéraire
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView("preparation")}
                    className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition sm:flex-none ${activeView === "preparation" ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20" : "text-slate-300 hover:text-white"}`}>
                    <ClipboardList size={16} /> Préparation
                  </button>
                </div>

                <div className="flex items-center gap-2 rounded-2xl bg-slate-950/80 px-4 py-3 shadow-inner shadow-black/20">
                  <CalendarDays size={16} className="text-sky-300" />
                  <div className="leading-tight">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Navigation
                    </p>
                    <p className="text-sm font-semibold text-white">
                      {activeView === "itinerary"
                        ? "Vue itinéraire"
                        : "Vue préparation"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      <div className="relative z-10 mx-auto max-w-[1680px] px-4 pt-4 md:px-6 md:pt-6 xl:px-8 xl:pt-8">
        {activeView === "itinerary" ? (
          <Timeline
            session={session}
            onOpenPreparation={() => setActiveView("preparation")}
          />
        ) : (
          <PreparationPage
            session={session}
            onBackToItinerary={() => setActiveView("itinerary")}
          />
        )}
      </div>
    </div>
  );
}

export default App;
