import { useMemo, useState } from "react";
import { Check, WifiOff } from "lucide-react";
import Sheet from "./Sheet";
import { useExchangeRates } from "../hooks/useExchangeRates";
import {
  formatEuros,
  getCurrencyForCountry,
  roundMoney,
  toEuros,
} from "../utils/currency";
import { getTripSegments } from "../utils/budget";
import { formatShortDate } from "../utils/dates";
import { fieldLabelClass, inputClass } from "../utils/ui";

const QUICK_LABELS = [
  { emoji: "🍜", label: "Repas" },
  { emoji: "☕", label: "Café / boisson" },
  { emoji: "🚕", label: "Transport" },
  { emoji: "🎟️", label: "Activité" },
  { emoji: "🏨", label: "Hébergement" },
  { emoji: "🛍️", label: "Achat" },
];

const parseAmount = (value) =>
  Number.parseFloat(String(value).replace(",", ".")) || 0;

// Saisie rapide d'une dépense : montant (en monnaie locale ou en euros),
// intitulé, étape. Elle est enregistrée comme une activité payée de l'étape.
export default function QuickAddSheet({
  steps,
  defaultStepId,
  onSubmit,
  onClose,
}) {
  const sortedSteps = useMemo(
    () => [...steps].sort((a, b) => a.position - b.position),
    [steps],
  );
  const [stepId, setStepId] = useState(
    defaultStepId || sortedSteps[0]?.id || "",
  );
  const selectedStep = sortedSteps.find((s) => s.id === stepId);
  const localCurrency = getCurrencyForCountry(selectedStep?.country);

  // null = suivre la monnaie locale de l'étape choisie
  const [chosenCurrency, setChosenCurrency] = useState(null);
  const currency = chosenCurrency || localCurrency;
  const currencyOptions = [...new Set([localCurrency, "EUR", "USD"])];

  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const { rates, fetchedAt } = useExchangeRates();
  const euros = toEuros(amount, currency, rates);
  const rateMissing = currency !== "EUR" && !rates?.[currency];
  const canSave =
    !saving && !!selectedStep && title.trim() && euros !== null && euros > 0;

  // Étapes regroupées par voyage pour retrouver vite la bonne dans la liste.
  const stepGroups = useMemo(() => {
    const segments = getTripSegments(sortedSteps);
    return segments.map((segment) => ({
      label: segment.label,
      steps: sortedSteps.filter(
        (s) =>
          segment.stepIds.includes(s.id) ||
          segment.stepIds.includes(s.parent_id),
      ),
    }));
  }, [sortedSteps]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    const amountEur = roundMoney(euros);
    const note =
      currency === "EUR"
        ? ""
        : `${parseAmount(amount).toLocaleString("fr-FR")} ${currency} (1 € = ${Math.round(rates[currency]).toLocaleString("fr-FR")} ${currency})`;
    try {
      await onSubmit({ stepId, title: title.trim(), amountEur, note });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet title="Nouvelle dépense" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="quick-amount" className={fieldLabelClass}>
            Montant payé
          </label>
          <div className="flex items-stretch gap-2">
            <input
              id="quick-amount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              autoFocus
              placeholder="0"
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value.replace(/[^\d.,]/g, ""))
              }
              className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-3xl font-black text-slate-900 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-700 dark:bg-slate-950/60 dark:text-white"
            />
            <div
              role="group"
              aria-label="Devise"
              className="flex shrink-0 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
              {currencyOptions.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setChosenCurrency(code)}
                  aria-pressed={currency === code}
                  className={`min-w-12 rounded-xl px-2 text-xs font-black transition-colors ${currency === code ? "bg-white text-sky-600 shadow-sm dark:bg-slate-950 dark:text-sky-400" : "text-slate-500 dark:text-slate-400"}`}>
                  {code}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-2 min-h-5 text-sm font-semibold text-slate-500 dark:text-slate-400">
            {rateMissing ? (
              <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <WifiOff size={14} /> Taux {currency} indisponible hors ligne :
                saisis le montant en €.
              </span>
            ) : currency !== "EUR" && euros > 0 ? (
              <>
                {/* Montant répété avec ses séparateurs : en dongs ou en
                    roupies, un zéro de trop passe vite inaperçu. */}
                {parseAmount(amount).toLocaleString("fr-FR")} {currency} ≈{" "}
                <span className="font-black text-emerald-600 dark:text-emerald-400">
                  {formatEuros(roundMoney(euros))}
                </span>
                {fetchedAt > 0 && (
                  <span className="font-normal">
                    {" "}
                    · taux du {formatShortDate(new Date(fetchedAt))}
                  </span>
                )}
              </>
            ) : null}
          </p>
        </div>

        <div>
          <label htmlFor="quick-title" className={fieldLabelClass}>
            Intitulé
          </label>
          <div className="mb-2 flex flex-wrap gap-2">
            {QUICK_LABELS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setTitle(item.label)}
                className={`min-h-10 rounded-full border px-3 text-sm font-bold transition-colors ${title === item.label ? "border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300" : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>
                {item.emoji} {item.label}
              </button>
            ))}
          </div>
          <input
            id="quick-title"
            type="text"
            placeholder="Ex. Pho, taxi aéroport, entrée du temple..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="quick-step" className={fieldLabelClass}>
            Étape
          </label>
          <select
            id="quick-step"
            value={stepId}
            onChange={(e) => {
              setStepId(e.target.value);
              setChosenCurrency(null);
            }}
            className={inputClass}>
            {stepGroups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.steps.map((step) => (
                  <option key={step.id} value={step.id}>
                    {step.parent_id ? "↳ " : ""}
                    {step.city}
                    {step.computedStartDate
                      ? ` · ${formatShortDate(step.computedStartDate)}`
                      : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={!canSave}
          className="flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 text-base font-black text-white shadow-lg shadow-sky-600/20 transition-colors hover:bg-sky-700 disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700">
          <Check size={20} />
          {saving
            ? "Enregistrement..."
            : euros > 0
              ? `Enregistrer ${formatEuros(roundMoney(euros))}`
              : "Enregistrer la dépense"}
        </button>
      </form>
    </Sheet>
  );
}
