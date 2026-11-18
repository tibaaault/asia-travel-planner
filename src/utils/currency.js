// Devise locale par pays, pour proposer la bonne monnaie sans la chercher.
export const COUNTRY_CURRENCY = {
  Indonésie: "IDR",
  Vietnam: "VND",
  Thaïlande: "THB",
  Laos: "LAK",
  Malaisie: "MYR",
  Cambodge: "KHR",
  Japon: "JPY",
  Singapour: "SGD",
};

export const CURRENCIES = [
  "EUR",
  "VND",
  "THB",
  "LAK",
  "IDR",
  "MYR",
  "KHR",
  "USD",
  "JPY",
  "SGD",
];

export const getCurrencyForCountry = (country) =>
  COUNTRY_CURRENCY[country] || "EUR";

// `rates` : nombre d'unités de chaque devise pour 1 €.
export const toEuros = (amount, currency, rates) => {
  const value = Number.parseFloat(String(amount).replace(",", "."));
  if (!Number.isFinite(value)) return 0;
  if (currency === "EUR") return value;
  const rate = rates?.[currency];
  if (!rate) return null;
  return value / rate;
};

export const roundMoney = (value) => Math.round(value * 100) / 100;

// Répartit un montant selon qui l'a payé : "me", "half" (moitié-moitié) ou
// "others" (parents, ami...). Renvoie ma part et celle des autres.
export const splitByPayer = (amountEur, payer) => {
  if (payer === "others") return { mine: 0, others: amountEur };
  if (payer === "half") {
    const mine = roundMoney(amountEur / 2);
    return { mine, others: roundMoney(amountEur - mine) };
  }
  return { mine: amountEur, others: 0 };
};

// "12 €" pour un montant rond, "4,20 €" sinon (jamais "4,2 €").
export const formatEuros = (value) => {
  const amount = roundMoney(Number(value) || 0);
  const digits = Number.isInteger(amount) ? 0 : 2;
  return `${amount.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits })} €`;
};
