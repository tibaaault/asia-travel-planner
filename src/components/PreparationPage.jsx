import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Hotel,
  Map as MapIcon, 
  Navigation,
  PlaneTakeoff,
  ShieldCheck,
  Trash2,
  Wallet,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { supabase } from "../config/supabaseClient";
import { useSteps } from "../hooks/useSteps";
import TripSummary from "./TripSummary";
import {
  getActivityEstimatedPrice,
  getActivityPaidPrice,
  getStepEstimatedTotal,
  getStepPaidTotal,
  getTripEstimatedTotal,
  getTripPaidTotal,
  getTopLevelSteps,
} from "../utils/budget";

const STORAGE_KEY = "travel_preparation_items_v1";

const CATEGORY_META = {
  vols: { label: "Vols", icon: PlaneTakeoff, tone: "sky", hint: "Billets, horaires, escales" },
  hebergement: { label: "Hébergements", icon: Hotel, tone: "emerald", hint: "Nuits, hôtels, acomptes" },
  transport: { label: "Transport", icon: Navigation, tone: "violet", hint: "Trains, ferries, scooters, transferts" },
  repas: { label: "Repas", icon: Wallet, tone: "amber", hint: "Budget nourriture et boissons" },
  activites: { label: "Activités", icon: MapIcon, tone: "rose", hint: "Visites, sorties, loisirs" },
  visa: { label: "Visa", icon: ShieldCheck, tone: "slate", hint: "Formalités, délais, documents" },
};

const PAYMENT_META = {
  a_payer: { label: "À payer", tone: "amber" },
  paye: { label: "Payé", tone: "emerald" },
  espece: { label: "Espèces", tone: "sky" },
  carte: { label: "Carte", tone: "violet" },
};

const CATEGORY_ORDER = ["vols", "hebergement", "transport", "repas", "activites", "visa"];

const initialFormState = {
  category: "vols",
  title: "",
  amount: "",
  payment: "a_payer",
  relatedTo: "",
  notes: "",
};

// ==========================================
// COMPOSANTS CELLULES ÉDITABLES (FAÇON EXCEL)
// ==========================================
const EditableCurrency = ({ value, onSave, readonly }) => {
  const [val, setVal] = useState(value);
  useEffect(() => setVal(value), [value]);

  const handleBlur = () => {
    if (Number(val) !== Number(value)) onSave(Number(val));
  };

  if (readonly) return <span>{Number(value).toLocaleString("fr-FR")} €</span>;

  return (
    <div className="flex items-center justify-end gap-1 group">
      <input
        type="number"
        min="0"
        step="0.01"
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={e => e.key === 'Enter' && e.target.blur()}
        className="w-20 bg-transparent text-right outline-none font-black text-slate-900 dark:text-white border-b border-transparent group-hover:border-slate-300 focus:border-sky-500 transition-colors"
      />
      <span className="text-slate-400 font-bold">€</span>
    </div>
  );
};

const EditableText = ({ value, onSave, readonly }) => {
  const [val, setVal] = useState(value);
  useEffect(() => setVal(value), [value]);

  const handleBlur = () => {
    if (val !== value) onSave(val);
  };

  if (readonly) return <div className="font-bold text-slate-900 dark:text-white">{value}</div>;

  return (
    <input
      type="text"
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={e => e.key === 'Enter' && e.target.blur()}
      className="w-full bg-transparent outline-none font-bold text-slate-900 dark:text-white border-b border-transparent hover:border-slate-300 focus:border-sky-500 transition-colors"
    />
  );
};

const EditableSelect = ({ value, options, onSave, readonly }) => {
  if (readonly) {
    const meta = PAYMENT_META[value];
    const isPending = value === 'a_payer';
    return (
      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${isPending ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-500/10 dark:text-amber-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-500/10 dark:text-emerald-300'}`}>
        {meta?.label || value}
      </span>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => onSave(e.target.value)}
      className="bg-transparent text-[11px] font-bold uppercase tracking-[0.14em] text-slate-700 dark:text-slate-300 outline-none border-b border-transparent hover:border-slate-300 focus:border-sky-500 cursor-pointer"
    >
      {Object.entries(options).map(([key, meta]) => (
        <option key={key} value={key}>{meta.label}</option>
      ))}
    </select>
  );
};

// ==========================================
// PAGE PRINCIPALE
// ==========================================
export default function PreparationPage({ onBackToItinerary }) {
  const { steps, currentTripId, updateStep } = useSteps();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initialFormState);
  const [isSyncing, setIsSyncing] = useState(false);
  const [ledgerFilter, setLedgerFilter] = useState("all");
  
  // État pour les groupes dépliés (Accordéon)
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  const getStorageKey = (tripId) => `${STORAGE_KEY}_${tripId || "draft"}`;

  const normalizeItem = (item) => ({
    id: item.id,
    category: item.category,
    title: item.title,
    amount: Number(item.amount) || 0,
    payment: item.payment,
    relatedTo: item.relatedTo || item.related_to || "",
    notes: item.notes || "",
    createdAt: item.createdAt || item.created_at || new Date().toISOString(),
  });

  const syncLocalCache = (tripId, nextItems) => {
    localStorage.setItem(getStorageKey(tripId), JSON.stringify(nextItems));
  };

  useEffect(() => {
    const cached = localStorage.getItem(getStorageKey(currentTripId));
    if (cached) {
      try { setItems(JSON.parse(cached)); } catch { setItems([]); }
    } else {
      setItems([]);
    }

    if (!currentTripId) return;

    let cancelled = false;
    const loadPreparationItems = async () => {
      setIsSyncing(true);
      try {
        const { data, error } = await supabase
          .from("preparation_items")
          .select("*")
          .eq("trip_id", currentTripId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (cancelled) return;

        const nextItems = (data || []).map(normalizeItem);
        setItems(nextItems);
        syncLocalCache(currentTripId, nextItems);
      } catch {
        if (cancelled) return;
        const fallback = localStorage.getItem(getStorageKey(currentTripId));
        if (fallback) {
          try { setItems(JSON.parse(fallback)); } catch { setItems([]); }
        }
      } finally {
        if (!cancelled) setIsSyncing(false);
      }
    };

    loadPreparationItems();
    return () => { cancelled = true; };
  }, [currentTripId]);

  const relatedOptions = useMemo(() => {
    const sortedSteps = [...steps].sort((a, b) => a.position - b.position);
    return [
      { value: "", label: "Voyage entier" },
      ...sortedSteps.map((step) => ({
        value: step.id,
        label: `${step.city} · ${step.country}`,
      })),
    ];
  }, [steps]);

  const tripBudget = getTripEstimatedTotal(steps);
  const tripSpent = getTripPaidTotal(steps);

  // Génération des lignes plates
  const budgetDetailRows = useMemo(() => {
    const sortedSteps = [...steps].sort((a, b) => a.position - b.position);
    const rootSteps = getTopLevelSteps(sortedSteps);
    const rows = [];

    rootSteps.forEach((parent) => {
      const branchSteps = [parent, ...sortedSteps.filter((step) => step.parent_id === parent.id)];
      
      rows.push({
        id: `branch-${parent.id}`,
        rowType: "step",
        stepId: parent.id,
        label: parent.city,
        source: "Étape mère",
        scope: parent.country,
        reference: `${branchSteps.length - 1} sous-étapes`,
        estimated: getStepEstimatedTotal(parent),
        paid: getStepPaidTotal(parent),
      });

      branchSteps.forEach((step) => {
        (step.activities || []).forEach((activity, index) => {
          const estimated = getActivityEstimatedPrice(activity);
          const paid = getActivityPaidPrice(activity);
          rows.push({
            id: `activity-${step.id}-${activity.id || index}`,
            rowType: "activity",
            stepId: step.id,
            activityId: activity.id || `${step.id}-${index}`,
            label: activity.title || "Activité sans titre",
            source: "Activité",
            scope: `${step.city} · ${step.country}`,
            reference: activity.place || "Lieu",
            estimated,
            paid,
          });
        });
      });
    });

    items.forEach((item) => {
      const estimated = Number(item.amount) || 0;
      const paid = item.payment === "a_payer" ? 0 : estimated;
      rows.push({
        id: `prep-${item.id}`,
        rowType: "preparation",
        itemId: item.id,
        category: item.category,
        title: item.title,
        label: item.title,
        source: "Préparation",
        scope: CATEGORY_META[item.category]?.label || item.category,
        reference: item.relatedTo
          ? relatedOptions.find((o) => o.value === item.relatedTo)?.label || item.relatedTo
          : "Voyage entier",
        estimated,
        paid,
        payment: item.payment,
        relatedTo: item.relatedTo || "",
      });
    });

    return rows;
  }, [items, relatedOptions, steps]);

  // NOUVELLE LOGIQUE : GROUPEMENT POUR L'ACCORDÉON
  const groupedRows = useMemo(() => {
    // Le vrai objet JS natif "Map" fonctionne maintenant
    const groupsMap = new Map(); 
    
    // Groupe par défaut
    groupsMap.set('general', {
      id: 'general',
      label: 'Général & Non rattaché',
      country: '',
      estimated: 0,
      paid: 0,
      parentRow: null,
      children: []
    });

    const sortedSteps = [...steps].sort((a, b) => a.position - b.position);
    const rootSteps = getTopLevelSteps(sortedSteps);
    const stepToRootMap = {};

    rootSteps.forEach(parent => {
      stepToRootMap[parent.id] = parent.id;
      groupsMap.set(parent.id, {
        id: parent.id,
        label: parent.city,
        country: parent.country,
        estimated: 0,
        paid: 0,
        parentRow: null,
        children: []
      });

      sortedSteps.filter(s => s.parent_id === parent.id).forEach(child => {
        stepToRootMap[child.id] = parent.id;
      });
    });

    budgetDetailRows.forEach(row => {
      if (ledgerFilter === "pending" && !(row.estimated > 0 && row.paid === 0)) return;
      if (ledgerFilter === "activities" && row.source !== "Activité") return;
      if (ledgerFilter === "preparation" && row.source !== "Préparation") return;

      if (row.rowType === 'step') {
        const group = groupsMap.get(row.stepId);
        if (group) {
          group.parentRow = row;
          group.estimated += row.estimated;
          group.paid += row.paid;
        }
      } else if (row.rowType === 'activity') {
        const groupId = stepToRootMap[row.stepId];
        const group = groupsMap.get(groupId);
        if (group) {
          group.children.push(row);
          group.estimated += row.estimated;
          group.paid += row.paid;
        }
      } else if (row.rowType === 'preparation') {
        let groupId = 'general';
        if (row.relatedTo && stepToRootMap[row.relatedTo]) {
          groupId = stepToRootMap[row.relatedTo];
        }
        const group = groupsMap.get(groupId);
        if (group) {
          group.children.push(row);
          group.estimated += row.estimated;
          group.paid += row.paid;
        }
      }
    });

    return Array.from(groupsMap.values()).filter(g => g.parentRow || g.children.length > 0);
  }, [budgetDetailRows, steps, ledgerFilter]);

  const toggleGroup = (groupId) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) newExpanded.delete(groupId);
    else newExpanded.add(groupId);
    setExpandedGroups(newExpanded);
  };

  const pendingBudgetRows = budgetDetailRows.filter((row) => row.estimated > 0 && row.paid === 0);
  const pendingBudgetValue = useMemo(() => budgetDetailRows.reduce((acc, row) => acc + Math.max(row.estimated - row.paid, 0), 0), [budgetDetailRows]);
  const pendingActivityCount = useMemo(() => budgetDetailRows.filter((row) => row.source === "Activité" && row.estimated > 0 && row.paid === 0).length, [budgetDetailRows]);

  const totals = useMemo(() => {
    const categoryTotals = CATEGORY_ORDER.reduce((acc, cat) => ({ ...acc, [cat]: 0 }), {});
    const paymentTotals = Object.keys(PAYMENT_META).reduce((acc, key) => ({ ...acc, [key]: 0 }), {});
    let total = 0;

    items.forEach((item) => {
      const amount = Number(item.amount) || 0;
      total += amount;
      categoryTotals[item.category] = (categoryTotals[item.category] || 0) + amount;
      paymentTotals[item.payment] = (paymentTotals[item.payment] || 0) + amount;
    });

    return { total, categoryTotals, paymentTotals };
  }, [items]);

  // Montant des frais généraux (hors étapes) déjà réglés, pour les fondre
  // dans le budget global au lieu de les isoler dans une case à part.
  const itemsPaidTotal = useMemo(
    () =>
      items.reduce(
        (acc, item) => acc + (item.payment !== "a_payer" ? Number(item.amount) || 0 : 0),
        0,
      ),
    [items],
  );

  // LOGIQUE D'ÉDITION INLINE "TABLEUR"
  const handleInlineEdit = async (row, field, value) => {
    if (row.rowType === "step") {
      const updates = {};
      if (field === 'estimated') updates.budget_estimated = value;
      if (field === 'paid') updates.budget_spent = value;
      await updateStep(row.stepId, updates);
    } 
    else if (row.rowType === "activity") {
      const currentStep = steps.find(s => s.id === row.stepId);
      if (!currentStep) return;
      const updatedActivities = (currentStep.activities || []).map((a, i) => {
        const aId = a.id || `${currentStep.id}-${i}`;
        if (String(aId) === String(row.activityId)) {
          if (field === 'title') return { ...a, title: value };
          if (field === 'estimated') return { ...a, estimatedPrice: value };
          if (field === 'paid') return { ...a, price: value };
        }
        return a;
      });
      await updateStep(row.stepId, { activities: updatedActivities });
    } 
    else if (row.rowType === "preparation") {
      const updatedItems = items.map((item) => {
        if (item.id === row.itemId) {
          if (field === 'title') return { ...item, title: value };
          if (field === 'estimated') return { ...item, amount: value };
          if (field === 'payment') return { ...item, payment: value };
        }
        return item;
      });

      setItems(updatedItems);
      syncLocalCache(currentTripId, updatedItems);

      if (currentTripId) {
        const payload = {};
        if (field === 'title') payload.title = value;
        if (field === 'estimated') payload.amount = value;
        if (field === 'payment') payload.payment = value;
        await supabase.from("preparation_items").update(payload).eq("id", row.itemId);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    const newItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : `prep-${Date.now()}`,
      category: form.category,
      title: form.title.trim(),
      amount: Number(form.amount) || 0,
      payment: form.payment,
      relatedTo: form.relatedTo,
      notes: form.notes.trim(),
      createdAt: new Date().toISOString(),
    };

    const nextItems = [newItem, ...items];
    setItems(nextItems);
    syncLocalCache(currentTripId, nextItems);
    setForm(initialFormState);

    if (!currentTripId) return;

    supabase.from("preparation_items").insert([{
        trip_id: currentTripId,
        category: newItem.category,
        title: newItem.title,
        amount: newItem.amount,
        payment: newItem.payment,
        related_to: newItem.relatedTo,
        notes: newItem.notes,
        created_at: newItem.createdAt,
      }]).then(() => {});
  };

  const deleteItem = (id) => {
    const nextItems = items.filter((item) => item.id !== id);
    setItems(nextItems);
    syncLocalCache(currentTripId, nextItems);
    if (currentTripId) supabase.from("preparation_items").delete().eq("id", id).then(() => {});
  };

  const clearAll = () => {
    if (!window.confirm("Supprimer tous les éléments de préparation ?")) return;
    setItems([]);
    syncLocalCache(currentTripId, []);
    if (currentTripId) supabase.from("preparation_items").delete().eq("trip_id", currentTripId).then(() => {});
  };

  // Budget combiné : étapes/activités + frais généraux saisis à la main,
  // pour afficher un seul total cohérent au lieu de le fragmenter.
  const combinedBudget = tripBudget + totals.total;
  const combinedPaid = tripSpent + itemsPaidTotal;

  const summaryCards = [
    { label: "Budget estimé", value: `${combinedBudget.toLocaleString("fr-FR")} €`, tone: "sky", note: "Étapes, activités et frais généraux" },
    { label: "Déjà payé", value: `${combinedPaid.toLocaleString("fr-FR")} €`, tone: "emerald", note: "Ce qui a réellement été payé" },
    { label: "À compléter", value: `${pendingBudgetValue.toLocaleString("fr-FR")} €`, tone: "amber", note: `${pendingBudgetRows.length} lignes sans paiement réel` },
  ];

  const toneClasses = {
    sky: "border-sky-100 bg-sky-50/90 dark:border-sky-900/40 dark:bg-sky-500/10",
    emerald: "border-emerald-100 bg-emerald-50/90 dark:border-emerald-900/40 dark:bg-emerald-500/10",
    violet: "border-violet-100 bg-violet-50/90 dark:border-violet-900/40 dark:bg-violet-500/10",
    amber: "border-amber-100 bg-amber-50/90 dark:border-amber-900/40 dark:bg-amber-500/10",
    slate: "border-slate-100 bg-slate-50/90 dark:border-slate-700 dark:bg-slate-900/80",
    rose: "border-rose-100 bg-rose-50/90 dark:border-rose-900/40 dark:bg-rose-500/10",
  };

  return (
    <div className="mx-auto max-w-[1680px] px-4 py-4 md:px-6 md:py-6 xl:px-8 xl:py-8">
      {/* HEADER */}
      <div className="mb-6 flex flex-col gap-3 rounded-[28px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] backdrop-blur dark:border-slate-700 dark:bg-slate-900/85 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
            <CalendarDays size={13} /> Préparation
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl">
            Budget, vols et logistique
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Regroupe ici les billets, hébergements, transports, repas, activités et visas.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button onClick={onBackToItinerary} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:bg-slate-800">
            <ArrowLeft size={16} /> Itinéraire
          </button>
          <button onClick={clearAll} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
            <Trash2 size={16} /> Vider
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {summaryCards.map((card) => (
            <div key={card.label} className={`rounded-[28px] border p-5 shadow-sm ${toneClasses[card.tone]}`}>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{card.label}</p>
              <p className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white">{card.value}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{card.note}</p>
            </div>
          ))}
        </div>

        <TripSummary steps={steps} visaStats={{}} totalDistance={0} />

        {/* 100% WIDTH TABLEAU DE SUIVI (FAÇON EXCEL) */}
        <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] backdrop-blur dark:border-slate-700 dark:bg-slate-900/85 sm:p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                <Wallet size={13} /> Tableau interactif
              </div>
              <h2 className="mt-3 text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Budget détaillé, façon tableur
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Clique sur les montants, les titres ou les statuts pour les modifier directement. Déplie les étapes mères pour voir les détails.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "all", label: "Tout" },
                  { key: "pending", label: "En attente" },
                  { key: "activities", label: "Activités" },
                  { key: "preparation", label: "Préparation" },
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setLedgerFilter(option.key)}
                    className={`rounded-full border px-3 py-1 transition ${ledgerFilter === option.key ? "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300"}`}>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-700">
            <div className="max-h-[600px] overflow-auto overscroll-contain">
              <table className="min-w-[800px] w-full border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 bg-slate-950/95 text-slate-100 backdrop-blur">
                  <tr className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-300">
                    <th className="px-4 py-4 w-10"></th>
                    <th className="px-4 py-4 w-40">Type</th>
                    <th className="px-4 py-4">Intitulé</th>
                    <th className="px-4 py-4 w-40 text-center">Statut</th>
                    <th className="px-4 py-4 w-32 text-right">Estimé</th>
                    <th className="px-4 py-4 w-32 text-right">Payé</th>
                    <th className="px-4 py-4 w-32 text-right text-sky-300">Écart</th>
                    <th className="px-4 py-4 w-16 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-950/50">
                  {groupedRows.map(group => {
                    const isExpanded = expandedGroups.has(group.id);
                    const gap = group.estimated - group.paid;

                    return (
                      <React.Fragment key={group.id}>
                        {/* LIGNE GROUPE (ÉTAPE MÈRE OU GÉNÉRAL) */}
                        <tr 
                          className="bg-slate-50/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          onClick={() => toggleGroup(group.id)}
                        >
                          <td className="px-4 py-3 text-slate-400">
                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <span className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200">
                              {group.id === 'general' ? 'Général' : 'Branche'}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-middle font-black text-slate-900 dark:text-white text-base">
                            {group.label}
                            {group.country && <span className="ml-2 text-xs font-normal text-slate-500">{group.country}</span>}
                          </td>
                          <td className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase">
                            {group.children.length + (group.parentRow ? 1 : 0)} Lignes
                          </td>
                          <td className="px-4 py-3 align-middle text-right font-black text-slate-900 dark:text-white">
                            {group.estimated.toLocaleString("fr-FR")} €
                          </td>
                          <td className="px-4 py-3 align-middle text-right font-black text-slate-900 dark:text-white">
                            {group.paid.toLocaleString("fr-FR")} €
                          </td>
                          <td className={`px-4 py-3 align-middle text-right font-black ${gap > 0 ? "text-amber-600 dark:text-amber-400" : gap < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                            {gap.toLocaleString("fr-FR")} €
                          </td>
                          <td></td>
                        </tr>

                        {/* LIGNES ENFANTS (DÉTAILS) */}
                        {isExpanded && [group.parentRow, ...group.children].filter(Boolean).map(row => {
                          const childGap = row.estimated - row.paid;
                          const isPending = row.estimated > 0 && row.paid === 0;

                          return (
                            <tr key={row.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors group/row ${isPending ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''}`}>
                              <td className="px-4 border-l-2 border-slate-200 dark:border-slate-700"></td>
                              <td className="px-4 py-3 align-middle">
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${row.source === "Étape mère" ? "bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300" : row.source === "Activité" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"}`}>
                                  {row.source}
                                </span>
                              </td>
                              <td className="px-4 py-3 align-middle">
                                <EditableText 
                                  value={row.label} 
                                  onSave={(val) => handleInlineEdit(row, 'title', val)}
                                  readonly={row.rowType === 'step'}
                                />
                                {row.reference && <div className="mt-1 text-[11px] text-slate-400">{row.reference}</div>}
                              </td>
                              <td className="px-4 py-3 align-middle text-center">
                                {row.rowType === "preparation" ? (
                                  <EditableSelect 
                                    value={row.payment}
                                    options={PAYMENT_META}
                                    onSave={(val) => handleInlineEdit(row, 'payment', val)}
                                  />
                                ) : (
                                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${row.paid > 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-500/10 dark:text-emerald-300' : row.estimated > 0 ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-500/10 dark:text-amber-300' : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300'}`}>
                                    {row.paid > 0 ? 'Payé' : row.estimated > 0 ? 'À compléter' : 'Neutre'}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 align-middle text-right">
                                <EditableCurrency value={row.estimated} onSave={(val) => handleInlineEdit(row, 'estimated', val)} />
                              </td>
                              <td className="px-4 py-3 align-middle text-right">
                                <EditableCurrency 
                                  value={row.paid} 
                                  onSave={(val) => handleInlineEdit(row, 'paid', val)} 
                                  readonly={row.rowType === 'preparation'}
                                />
                              </td>
                              <td className={`px-4 py-3 align-middle text-right font-black ${childGap > 0 ? "text-amber-600 dark:text-amber-400" : childGap < 0 ? "text-red-600 dark:text-red-400" : "text-slate-300 dark:text-slate-600"}`}>
                                {childGap !== 0 ? `${childGap.toLocaleString("fr-FR")} €` : '-'}
                              </td>
                              <td className="px-4 py-3 align-middle text-center">
                                {row.rowType === "preparation" && (
                                  <button onClick={() => deleteItem(row.itemId)} aria-label={`Supprimer ${row.label}`} title="Supprimer" className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover/row:opacity-100">
                                    <Trash2 size={16} className="mx-auto" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FRAIS GÉNÉRAUX : dépenses hors étapes (nourriture, visa, assurance...) */}
        <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] backdrop-blur dark:border-slate-700 dark:bg-slate-900/85 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                <Wallet size={13} /> Frais généraux
              </div>
              <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
                Dépenses hors étape : nourriture au jour le jour, visa, assurance... Tu peux aussi rattacher un coût à une étape sans ouvrir sa fiche.
              </p>
            </div>

            {items.length > 0 && (
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {Object.entries(PAYMENT_META).map(([key, meta]) => (
                  <div key={key} className={`rounded-xl border px-3 py-1.5 ${toneClasses[meta.tone] || toneClasses.slate}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{meta.label}</span>{" "}
                    <span className="text-sm font-black">{(totals.paymentTotals[key] || 0).toLocaleString()} €</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-[2fr_1fr]">
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Intitulé
                </label>
                <input type="text" placeholder="Ex. Nourriture, assurance, visa..." value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Catégorie
                  </label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                    {CATEGORY_ORDER.map(cat => <option key={cat} value={cat}>{CATEGORY_META[cat].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Statut
                  </label>
                  <select value={form.payment} onChange={(e) => setForm({ ...form, payment: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                    {Object.entries(PAYMENT_META).map(([val, meta]) => <option key={val} value={val}>{meta.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Montant
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-sky-400 focus-within:ring-4 focus-within:ring-sky-500/10 dark:border-slate-700 dark:bg-slate-900">
                  <input type="number" min="0" step="0.01" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full bg-transparent text-sm outline-none dark:text-white" />
                  <span className="text-sm font-black text-slate-400 dark:text-slate-500">€</span>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Étape liée (optionnel)
                </label>
                <select value={form.relatedTo} onChange={(e) => setForm({ ...form, relatedTo: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                  {relatedOptions.map((opt) => <option key={opt.value || "travel"} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>

              <button type="submit" className="w-full rounded-xl bg-sky-600 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-sky-700">
                Ajouter la dépense
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}