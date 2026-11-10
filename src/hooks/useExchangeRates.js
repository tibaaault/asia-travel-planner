import { useEffect, useState } from "react";

const CACHE_KEY = "exchange_rates_eur_v1";
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

const readCache = () => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
  } catch {
    return null;
  }
};

// Taux de change pour 1 €. Le dernier taux connu est gardé en cache : en
// voyage on saisit souvent une dépense sans réseau, et un taux de la veille
// vaut mieux que pas de conversion du tout.
export function useExchangeRates(enabled = true) {
  const [state, setState] = useState(() => {
    const cached = readCache();
    return { rates: cached?.rates || null, fetchedAt: cached?.fetchedAt || 0 };
  });

  useEffect(() => {
    if (!enabled) return;
    if (state.rates && Date.now() - state.fetchedAt < MAX_AGE_MS) return;

    let cancelled = false;
    fetch("https://open.er-api.com/v6/latest/EUR")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data?.rates) return;
        const next = { rates: data.rates, fetchedAt: Date.now() };
        localStorage.setItem(CACHE_KEY, JSON.stringify(next));
        setState(next);
      })
      .catch((err) => console.error("Erreur devises:", err));

    return () => {
      cancelled = true;
    };
  }, [enabled, state.rates, state.fetchedAt]);

  return state;
}
