import { useEffect } from "react";
import { X } from "lucide-react";

// Panneau modal : plein écran sur téléphone (les champs restent en haut,
// jamais cachés par le clavier), fenêtre centrée sur grand écran.
export default function Sheet({ title, onClose, children }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in sm:items-center sm:p-6"
      onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="safe-x animate-sheet-up flex h-dvh w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-3xl dark:bg-slate-900">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] dark:border-slate-800">
          <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
            <X size={22} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
          {children}
        </div>
      </div>
    </div>
  );
}
