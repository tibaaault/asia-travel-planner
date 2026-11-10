import { Map, MapPinned, Menu, Plus, Wallet } from "lucide-react";

const TABS = [
  { id: "itinerary", label: "Itinéraire", icon: MapPinned },
  { id: "map", label: "Carte", icon: Map },
  { id: "preparation", label: "Budget", icon: Wallet },
  { id: "more", label: "Plus", icon: Menu },
];

// Barre de navigation du bas, à portée de pouce. Le bouton central ouvre
// la saisie rapide d'une dépense (réservé à l'admin).
export default function MobileNav({ activeView, onChange, onQuickAdd }) {
  const renderTab = (tab) => {
    const isActive = activeView === tab.id;
    return (
      <button
        key={tab.id}
        type="button"
        onClick={() => onChange(tab.id)}
        aria-current={isActive ? "page" : undefined}
        className={`flex h-14 flex-1 flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${isActive ? "text-sky-600 dark:text-sky-400" : "text-slate-400 dark:text-slate-500"}`}>
        <tab.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
        {tab.label}
      </button>
    );
  };

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_32px_-20px_rgba(15,23,42,0.35)] backdrop-blur print:hidden lg:hidden dark:border-slate-800 dark:bg-slate-950/95">
      <div className="safe-x mx-auto flex max-w-lg items-center">
        {TABS.slice(0, 2).map(renderTab)}
        {onQuickAdd && (
          <div className="flex w-16 shrink-0 justify-center">
            <button
              type="button"
              onClick={onQuickAdd}
              aria-label="Ajouter une dépense"
              className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-sky-500 text-white shadow-lg shadow-sky-500/40 ring-4 ring-white active:scale-95 dark:ring-slate-950">
              <Plus size={28} strokeWidth={2.5} />
            </button>
          </div>
        )}
        {TABS.slice(2).map(renderTab)}
      </div>
    </nav>
  );
}
