import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Send,
  User,
  Trash2,
  MessageSquare,
  Loader2,
  Hotel,
  Plane,
  Wallet,
  Save,
  CheckCircle,
  FileText,
  UploadCloud,
  Download,
  CheckSquare,
  Edit2,
  PlusCircle,
  Calculator,
  MapPin,
  Map as MapIcon,
  Calendar,
  ArrowLeft,
  ChevronDown,
  Check,
} from "lucide-react";
import { useNotes } from "../hooks/useNotes";
import { useDocuments } from "../hooks/useDocuments";
import { formatDaysNights, getDaysFromNights } from "../utils/duration";
import { geocodePlace } from "../utils/geocoding";
import { useExchangeRates } from "../hooks/useExchangeRates";
import {
  CURRENCIES,
  formatEuros,
  getCurrencyForCountry,
} from "../utils/currency";
import { inputClass } from "../utils/ui";
import { createId } from "../utils/ids";

const TAB_STORAGE_KEY = "step_modal_tab";
const TAB_IDS = ["notes", "checklist", "activities", "logistics", "documents"];

const getWeatherEmoji = (code) => {
  if (code === 0) return "☀️";
  if (code > 0 && code <= 3) return "⛅";
  if (code >= 45 && code <= 48) return "🌫️";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "🌧️";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "❄️";
  if (code >= 95) return "⛈️";
  return "🌡️";
};

const COUNTRY_SPECIFIC_SUGGESTIONS = {
  Vietnam: [
    "Imprimer l'E-visa",
    "Acheter carte SIM Viettel",
    "Prendre une veste de pluie (Nord)",
    "Télécharger l'app Grab",
  ],
  Thaïlande: [
    "Vêtement couvrant pour les temples",
    "Acheter répulsif moustiques (Soffell)",
    "Retirer des Bahts (frais fixes de 220 THB)",
    "Télécharger Bolt/Grab",
  ],
  Malaisie: [
    "Remplir la MDAC (72h avant)",
    "Adaptateur prise Type G",
    "Acheter carte Touch 'n Go (transports)",
    "Prévoir un pull (Cameron Highlands)",
  ],
  Indonésie: [
    "Payer la taxe de séjour Bali",
    "Remplir la déclaration de douane (ECD)",
    "Télécharger l'app Gojek",
    "Chaussures de marche (Volcans)",
  ],
  Japon: [
    "Acheter une eSIM ou Pocket WiFi",
    "Vérifier la validité du JR Pass",
    "Télécharger Maps.me / Suica numérique",
  ],
  Cambodge: [
    "Prévoir des Dollars USD neufs",
    "Photo d'identité pour le visa",
    "Télécharger PassApp (Tuk-Tuk)",
  ],
};

const StatusBadgeSelector = ({ currentStatus, onChange, disabled }) => {
  const statuses = [
    {
      value: "A_RESERVER",
      label: "À réserver",
      color:
        "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
      activeColor: "bg-amber-500 text-white shadow-md",
    },
    {
      value: "RESERVE",
      label: "Réservé",
      color:
        "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
      activeColor: "bg-blue-500 text-white shadow-md",
    },
    {
      value: "PAYE",
      label: "Payé",
      color:
        "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
      activeColor: "bg-emerald-500 text-white shadow-md",
    },
  ];

  return (
    <div className="flex w-full flex-wrap gap-2 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-xl sm:w-fit border border-slate-200 dark:border-slate-700">
      {statuses.map((s) => {
        const isActive = currentStatus === s.value;
        return (
          <button
            key={s.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(s.value)}
            className={`min-h-10 sm:min-h-0 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all flex-1 sm:flex-none ${
              isActive
                ? s.activeColor
                : `${s.color} hover:bg-slate-200 dark:hover:bg-slate-700`
            } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
            {s.label}
          </button>
        );
      })}
    </div>
  );
};

// Placer une activité sur la carte ne doit jamais bloquer son
// enregistrement : sur un réseau capricieux, on abandonne après 4 s.
const geocodeWithTimeout = (query, ms = 4000) =>
  Promise.race([
    geocodePlace(query),
    new Promise((resolve) => setTimeout(() => resolve(null), ms)),
  ]).catch(() => null);

// État dont chaque modification signale "il y a quelque chose à enregistrer".
const useTrackedState = (initialValue, onChange) => {
  const [value, setValue] = useState(initialValue);
  const setAndMark = (next) => {
    setValue(next);
    onChange();
  };
  return [value, setAndMark];
};

export default function StepModal({
  step,
  onClose,
  onUpdateStep,
  onDeleteStep,
  isReadOnly,
}) {
  // 🚫 BLOCAGE DU SCROLL DU FOND SUR MOBILE
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const { notes, loadingNotes, addNote, deleteNote, updateNote } = useNotes(
    step.id,
  );
  const { documents, loadingDocs, uploading, uploadDocument, deleteDocument } =
    useDocuments(step.id);

  // On rouvre la fiche sur le dernier onglet utilisé : en voyage on revient
  // presque toujours au même (activités ou logistique).
  const [activeTab, setActiveTabState] = useState(() => {
    const saved = localStorage.getItem(TAB_STORAGE_KEY);
    return TAB_IDS.includes(saved) ? saved : "notes";
  });
  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    localStorage.setItem(TAB_STORAGE_KEY, tab);
  };
  const [username, setUsername] = useState("");
  const [isEditingUsername, setIsEditingUsername] = useState(false);

  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [editCity, setEditCity] = useState(step.city);
  const [editCountry, setEditCountry] = useState(step.country);
  const [editDuration, setEditDuration] = useState(step.duration);
  const [editTripSegment, setEditTripSegment] = useState(step.trip_segment || "");
  const isTopLevelStep = !step.parent_id || step.parent_id === "null";

  const [newNote, setNewNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteContent, setEditingNoteContent] = useState("");

  const [activities, setActivities] = useState(step.activities || []);
  const [newActivityTitle, setNewActivityTitle] = useState("");
  const [newActivityPlace, setNewActivityPlace] = useState("");
  const [newActivityNotes, setNewActivityNotes] = useState("");
  const [newActivityEstimatedPrice, setNewActivityEstimatedPrice] =
    useState("");
  const [newActivityPaidPrice, setNewActivityPaidPrice] = useState("");
  const [savingActivities, setSavingActivities] = useState(false);
  const [activitiesDirty, setActivitiesDirty] = useState(false);
  const [expandedActivityId, setExpandedActivityId] = useState(null);
  const [showNewActivityDetails, setShowNewActivityDetails] = useState(false);

  const [logisticsDirty, setLogisticsDirty] = useState(false);
  const [logisticsSaved, setLogisticsSaved] = useState(false);
  const markLogisticsDirty = () => {
    setLogisticsDirty(true);
    setLogisticsSaved(false);
  };
  const useLogisticsField = (initialValue) =>
    useTrackedState(initialValue, markLogisticsDirty);
  const [lodging, setLodging] = useLogisticsField(step.lodging_info || "");
  const [transport, setTransport] = useLogisticsField(
    step.transport_info || "",
  );
  const [lodgingStatus, setLodgingStatus] = useLogisticsField(
    step.lodging_status || "A_RESERVER",
  );
  const [transportStatus, setTransportStatus] = useLogisticsField(
    step.transport_status || "A_RESERVER",
  );
  const [budget, setBudget] = useLogisticsField(step.budget_estimated || "0");
  const [budgetSpent, setBudgetSpent] = useLogisticsField(
    step.budget_spent || "0",
  );
  const [lodgingPriceEstimated, setLodgingPriceEstimated] = useLogisticsField(
    step.lodging_price_estimated || "0",
  );
  const [lodgingPricePaid, setLodgingPricePaid] = useLogisticsField(
    step.lodging_price_paid || "0",
  );
  const [transportPriceEstimated, setTransportPriceEstimated] =
    useLogisticsField(step.transport_price_estimated || "0");
  const [transportPricePaid, setTransportPricePaid] = useLogisticsField(
    step.transport_price_paid || "0",
  );

  const [checklist, setChecklist] = useState(step.checklist || []);
  const [newChecklistItem, setNewChecklistItem] = useState("");

  const { rates: exchangeRates } = useExchangeRates(activeTab === "logistics");
  const [localCurrency, setLocalCurrency] = useState(() => {
    const countryCurrency = getCurrencyForCountry(step.country);
    return countryCurrency === "EUR" ? "THB" : countryCurrency;
  });
  const [localAmount, setLocalAmount] = useState("");
  const [weather, setWeather] = useState(null);

  const editDays = getDaysFromNights(editDuration);

  useEffect(() => {
    const savedName = localStorage.getItem("travel_username");
    if (savedName) setUsername(savedName);
    else if (!isReadOnly) setIsEditingUsername(true);
  }, [isReadOnly]);

  useEffect(() => {
    if (!step.lat || !step.lng) return;

    // Un voyage se prépare des mois à l'avance : la météo "temps réel"
    // n'a aucun rapport avec ce qu'il fera sur place le jour J. On
    // affiche à la place une météo typique, calculée sur la même période
    // (± 5 jours) de l'année complète la plus récente disponible.
    const targetDate = step.computedStartDate
      ? new Date(step.computedStartDate)
      : new Date();
    const currentYear = new Date().getFullYear();
    const referenceYear =
      targetDate.getFullYear() > currentYear
        ? currentYear - 1
        : targetDate.getFullYear() - 1;

    const referenceDate = new Date(targetDate);
    referenceDate.setFullYear(referenceYear);
    const shiftDays = (date, delta) => {
      const shifted = new Date(date);
      shifted.setDate(shifted.getDate() + delta);
      return shifted;
    };
    const toISODate = (date) => date.toISOString().slice(0, 10);
    const startDate = toISODate(shiftDays(referenceDate, -5));
    const endDate = toISODate(shiftDays(referenceDate, 5));

    fetch(
      `https://archive-api.open-meteo.com/v1/archive?latitude=${step.lat}&longitude=${step.lng}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`,
    )
      .then((res) => res.json())
      .then((data) => {
        const maxTemps = data.daily?.temperature_2m_max?.filter((t) => t != null);
        const minTemps = data.daily?.temperature_2m_min?.filter((t) => t != null);
        const codes = data.daily?.weathercode?.filter((c) => c != null);
        if (!maxTemps?.length || !minTemps?.length || !codes?.length) return;

        const average = (values) =>
          values.reduce((sum, value) => sum + value, 0) / values.length;
        const codeCounts = {};
        codes.forEach((code) => {
          codeCounts[code] = (codeCounts[code] || 0) + 1;
        });
        const mostFrequentCode = Number(
          Object.entries(codeCounts).sort((a, b) => b[1] - a[1])[0][0],
        );

        setWeather({
          tempMax: Math.round(average(maxTemps)),
          tempMin: Math.round(average(minTemps)),
          emoji: getWeatherEmoji(mostFrequentCode),
          referenceYear,
        });
      })
      .catch((err) => console.error("Erreur météo:", err));
  }, [step.lat, step.lng, step.computedStartDate]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (activeTab === "notes") {
      scrollToBottom();
    }
  }, [notes, activeTab]);

  const convertedAmount =
    localAmount && exchangeRates && exchangeRates[localCurrency]
      ? (parseFloat(localAmount) / exchangeRates[localCurrency]).toFixed(2)
      : "0.00";

  const handleSaveUsername = (e) => {
    e.preventDefault();
    if (username.trim()) {
      localStorage.setItem("travel_username", username.trim());
      setIsEditingUsername(false);
    }
  };

  const handleSaveHeader = async () => {
    if (isReadOnly) return;
    const parsedDuration = parseInt(editDuration, 10);
    await onUpdateStep(step.id, {
      city: editCity,
      country: editCountry,
      duration: Number.isNaN(parsedDuration) ? 0 : parsedDuration,
      ...(isTopLevelStep && { trip_segment: editTripSegment.trim() || null }),
    });
    setIsEditingHeader(false);
  };

  // Enregistre la liste d'activités. Seuls les lieux nouveaux ou modifiés
  // sont géocodés, et un échec (hors ligne) n'empêche pas l'enregistrement.
  const persistActivities = async (list, geocodeIds) => {
    setSavingActivities(true);
    try {
      const normalizedActivities = await Promise.all(
        list
          .filter((activity) => activity.title?.trim())
          .map(async (activity) => {
            const place = activity.place?.trim() || "";
            let location = null;
            if (place && geocodeIds.has(activity.id)) {
              location = await geocodeWithTimeout(
                `${place}, ${editCity}, ${editCountry}`,
              );
            }

            return {
              id: activity.id || createId(),
              title: activity.title.trim(),
              place,
              notes: activity.notes?.trim() || "",
              // Un estimé saisi à 0 reste à 0 ; on ne reprend le prix payé
              // que si l'estimé n'a jamais été renseigné.
              estimatedPrice:
                activity.estimatedPrice === undefined ||
                activity.estimatedPrice === null ||
                activity.estimatedPrice === ""
                  ? Number.parseFloat(activity.price) || 0
                  : Number.parseFloat(activity.estimatedPrice) || 0,
              price: Number.parseFloat(activity.price) || 0,
              lat: location?.lat ?? activity.lat ?? null,
              lng: location?.lng ?? activity.lng ?? null,
            };
          }),
      );

      setActivities(normalizedActivities);
      setActivitiesDirty(false);
      await onUpdateStep(step.id, { activities: normalizedActivities });
    } finally {
      setSavingActivities(false);
    }
  };

  // Activités dont le lieu a changé depuis le dernier enregistrement (ou
  // n'a jamais pu être placé sur la carte).
  const getPlaceChangedIds = (list) => {
    const savedById = new Map(
      (step.activities || []).map((activity) => [activity.id, activity]),
    );
    return new Set(
      list
        .filter((activity) => {
          const place = activity.place?.trim() || "";
          const saved = savedById.get(activity.id);
          return (
            place &&
            (!saved || (saved.place || "").trim() !== place || saved.lat == null)
          );
        })
        .map((activity) => activity.id),
    );
  };

  const addActivity = async () => {
    if (!newActivityTitle.trim() || isReadOnly || savingActivities) return;
    const nextActivities = [
      ...activities,
      {
        id: createId(),
        title: newActivityTitle.trim(),
        place: newActivityPlace.trim(),
        notes: newActivityNotes.trim(),
        estimatedPrice: newActivityEstimatedPrice,
        price: newActivityPaidPrice,
        lat: null,
        lng: null,
      },
    ];
    setNewActivityTitle("");
    setNewActivityPlace("");
    setNewActivityNotes("");
    setNewActivityEstimatedPrice("");
    setNewActivityPaidPrice("");
    setShowNewActivityDetails(false);
    await persistActivities(nextActivities, getPlaceChangedIds(nextActivities));
  };

  const updateActivityField = (activityId, field, value) => {
    setActivitiesDirty(true);
    setActivities((currentActivities) =>
      currentActivities.map((activity) =>
        activity.id === activityId ? { ...activity, [field]: value } : activity,
      ),
    );
  };

  const deleteActivity = async (activityId) => {
    if (isReadOnly || savingActivities) return;
    const target = activities.find((activity) => activity.id === activityId);
    if (
      !window.confirm(
        `Supprimer « ${target?.title || "cette activité"} » ?`,
      )
    )
      return;
    const nextActivities = activities.filter(
      (activity) => activity.id !== activityId,
    );
    await persistActivities(nextActivities, getPlaceChangedIds(nextActivities));
  };

  const handleSaveActivities = async (e) => {
    e?.preventDefault();
    if (isReadOnly) return;
    await persistActivities(activities, getPlaceChangedIds(activities));
  };

  // Fermeture : on prévient s'il reste des modifications non enregistrées.
  const requestClose = () => {
    if (
      !isReadOnly &&
      (activitiesDirty || logisticsDirty) &&
      !window.confirm(
        "Des modifications ne sont pas enregistrées. Fermer sans enregistrer ?",
      )
    )
      return;
    onClose();
  };

  const handleSendNote = (e) => {
    e.preventDefault();
    if (!newNote.trim() || isReadOnly) return;
    addNote(username || "Visiteur", newNote);
    setNewNote("");
  };

  const handleNoteComposerKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendNote(e);
    }
  };

  const startEditingNote = (note) => {
    setEditingNoteId(note.id);
    setEditingNoteContent(note.content || "");
  };

  const cancelEditingNote = () => {
    setEditingNoteId(null);
    setEditingNoteContent("");
  };

  const saveEditedNote = async (noteId) => {
    if (!editingNoteContent.trim()) return;
    await updateNote(noteId, editingNoteContent);
    cancelEditingNote();
  };

  const handleEditNoteKeyDown = (e, noteId) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      saveEditedNote(noteId);
    }
  };

  const formatNoteDate = (dateString) => {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  };

  const handleSaveLogistics = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;
    await onUpdateStep(step.id, {
      lodging_info: lodging,
      transport_info: transport,
      lodging_status: lodgingStatus,
      transport_status: transportStatus,
      budget_estimated: parseFloat(budget) || 0,
      budget_spent: parseFloat(budgetSpent) || 0,
      lodging_price_estimated: parseFloat(lodgingPriceEstimated) || 0,
      lodging_price_paid: parseFloat(lodgingPricePaid) || 0,
      transport_price_estimated: parseFloat(transportPriceEstimated) || 0,
      transport_price_paid: parseFloat(transportPricePaid) || 0,
    });
    setLogisticsDirty(false);
    setLogisticsSaved(true);
  };

  const handleFileUpload = (e) => {
    if (isReadOnly) return;
    const file = e.target.files[0];
    if (file) uploadDocument(file);
    e.target.value = null;
  };

  const handleAddChecklistItem = async (e) => {
    e.preventDefault();
    if (!newChecklistItem.trim() || isReadOnly) return;
    const updatedList = [
      ...checklist,
      { id: Date.now().toString(), text: newChecklistItem, checked: false },
    ];
    setChecklist(updatedList);
    setNewChecklistItem("");
    await onUpdateStep(step.id, { checklist: updatedList });
  };

  const toggleChecklistItem = async (itemId) => {
    if (isReadOnly) return;
    const updatedList = checklist.map((item) =>
      item.id === itemId ? { ...item, checked: !item.checked } : item,
    );
    setChecklist(updatedList);
    await onUpdateStep(step.id, { checklist: updatedList });
  };

  const deleteChecklistItem = async (itemId) => {
    if (isReadOnly) return;
    const updatedList = checklist.filter((item) => item.id !== itemId);
    setChecklist(updatedList);
    await onUpdateStep(step.id, { checklist: updatedList });
  };

  // Prix estimé / payé d'un bloc Hébergement ou Transport
  const renderPriceInputs = (estimated, setEstimated, paid, setPaid) => (
    <div className="mt-3 grid grid-cols-2 gap-3">
      {[
        { label: "Prix estimé", value: estimated, onChange: setEstimated },
        { label: "Prix payé", value: paid, onChange: setPaid },
      ].map((field) => (
        <label key={field.label} className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {field.label}
          </span>
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              disabled={isReadOnly}
              className={`${inputClass} pr-8`}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
              €
            </span>
          </div>
        </label>
      ))}
    </div>
  );

  // Rendue directement dans <body> : sinon elle resterait prise dans la
  // couche du contenu, sous la barre de navigation du téléphone.
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden bg-slate-900/60 backdrop-blur-sm transition-opacity">
      {/* PANNEAU LATÉRAL */}
      <div className="safe-x bg-white dark:bg-slate-900 w-full md:max-w-3xl h-dvh shadow-2xl flex flex-col transform transition-transform duration-300 translate-x-0 overflow-hidden md:border-l border-slate-200 dark:border-slate-800">
        {/* HEADER STICKY */}
        <div className="shrink-0 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-20">
          <div className="px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 sm:pb-5 sm:pt-5">
            <div className="flex items-start justify-between">
              {isEditingHeader && !isReadOnly ? (
                <div className="flex-1 mr-4 sm:mr-6 space-y-3">
                  <input
                    type="text"
                    name="edit-step-country"
                    value={editCountry}
                    onChange={(e) => setEditCountry(e.target.value)}
                    className={inputClass}
                    placeholder="Pays"
                    autoComplete="new-password"
                  />
                  <input
                    type="text"
                    name="edit-step-city"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className={`${inputClass} font-bold text-lg`}
                    placeholder="Ville"
                    autoComplete="new-password"
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={editDuration}
                      onChange={(e) => setEditDuration(e.target.value)}
                      className={`${inputClass} w-full sm:w-32`}
                      placeholder="Nuits"
                    />
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      nuit{editDuration > 1 ? "s" : ""} / {editDays} jour{editDays > 1 ? "s" : ""}
                    </span>
                  </div>
                  {isTopLevelStep && (
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Début d'un voyage (optionnel)
                      </span>
                      <input
                        type="text"
                        value={editTripSegment}
                        onChange={(e) => setEditTripSegment(e.target.value)}
                        className={inputClass}
                        placeholder="Ex. Vietnam partie 2 — vide si l'étape continue le voyage précédent"
                        autoComplete="off"
                      />
                    </label>
                  )}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={handleSaveHeader}
                      className="min-h-11 bg-blue-600 text-white px-5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors flex-1 sm:flex-none">
                      Enregistrer
                    </button>
                    <button
                      onClick={() => setIsEditingHeader(false)}
                      className="min-h-11 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 px-5 rounded-xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex-1 sm:flex-none">
                      Annuler
                    </button>
                    {onDeleteStep && (
                      <button
                        type="button"
                        onClick={() => onDeleteStep(step.id)}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 sm:ml-auto sm:w-auto">
                        <Trash2 size={16} /> Supprimer l’étape
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 px-3 py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                      <MapPin size={12} /> {step.country}
                    </span>
                    {weather && (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm"
                        title={`Météo typique sur cette période, d'après ${weather.referenceYear}`}>
                        {weather.emoji} {weather.tempMin}-{weather.tempMax}°C
                        <span className="hidden font-normal text-slate-400 sm:inline">
                          typique
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 sm:gap-3">
                    <h2 className="min-w-0 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                      {step.city}
                    </h2>
                    {!isReadOnly && (
                      <button
                        onClick={() => setIsEditingHeader(true)}
                        className="flex h-11 w-11 shrink-0 items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors rounded-xl"
                        aria-label="Modifier l'étape"
                        title="Éditer l'étape">
                        <Edit2 size={18} />
                      </button>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-2">
                    <Calendar size={14} /> Durée prévue :{" "}
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {formatDaysNights(step.duration)}
                    </span>
                  </p>
                </div>
              )}

              <button
                onClick={requestClose}
                aria-label="Fermer"
                title="Fermer"
                className="flex h-11 w-11 items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-700 shrink-0">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* ONGlets (TABS) */}
          <div
            role="tablist"
            className="grid grid-cols-5 sm:px-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
            {[
              { id: "notes", icon: MessageSquare, label: "Notes" },
              { id: "checklist", icon: CheckSquare, label: "Checklist" },
              { id: "activities", icon: MapIcon, label: "Activités" },
              { id: "logistics", icon: Hotel, label: "Logistique" },
              { id: "documents", icon: FileText, label: "Fichiers" },
            ].map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-14 px-0.5 text-[10px] sm:text-[13px] font-bold uppercase sm:tracking-wider flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}>
                <tab.icon size={18} /> <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* CONTENEUR PRINCIPAL DU PANNEAU */}
        <div className="flex-1 min-h-0 overflow-hidden bg-slate-50/30 dark:bg-slate-900">
          <div className="flex h-full min-h-0 flex-col">
            {/* ONGLET 1 : NOTES (CHAT) */}
            {activeTab === "notes" && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {!isReadOnly && (
                  <div className="px-4 sm:px-6 py-3 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between text-sm shrink-0 gap-2">
                    {isEditingUsername ? (
                      <form
                        onSubmit={handleSaveUsername}
                        className="flex gap-2 w-full">
                        <input
                          type="text"
                          placeholder="Ton prénom"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className={`${inputClass} py-1.5 flex-1`}
                          required
                        />
                        <button
                          type="submit"
                          className="bg-blue-600 text-white px-4 py-1.5 rounded-xl text-sm font-bold">
                          Valider
                        </button>
                      </form>
                    ) : (
                      <>
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2 text-sm font-medium">
                          <User size={16} /> Connecté en tant que :{" "}
                          <strong className="text-slate-900 dark:text-white truncate max-w-37.5 sm:max-w-xs">
                            {username}
                          </strong>
                        </span>
                        <button
                          onClick={() => setIsEditingUsername(true)}
                          className="min-h-10 px-2 text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline self-end sm:self-auto">
                          Modifier
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Zone des messages (Elle seule scrolle) */}
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain p-4 sm:p-6 space-y-6">
                  {loadingNotes ? (
                    <div className="flex justify-center py-10">
                      <Loader2
                        className="animate-spin text-blue-500"
                        size={32}
                      />
                    </div>
                  ) : notes.length === 0 ? (
                    <div className="text-center py-10">
                      <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageSquare size={24} />
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 font-medium">
                        Aucune note pour le moment.
                      </p>
                      <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                        Utilise cet espace pour noter des idées, adresses ou
                        recommandations.
                      </p>
                    </div>
                  ) : (
                    notes.map((note) => {
                      const isMe = note.author_name === username;
                      const isEditingThisNote = editingNoteId === note.id;
                      return (
                        <div
                          key={note.id}
                          className={`flex flex-col max-w-[90%] sm:max-w-[85%] ${isMe && !isReadOnly ? "ml-auto items-end" : "items-start"}`}>
                          <div className="flex items-baseline gap-2 mb-1.5 px-1">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              {note.author_name}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              {formatNoteDate(note.created_at)}
                            </span>
                          </div>
                          <div
                            className={`p-4 rounded-3xl shadow-sm relative group ${isMe && !isReadOnly ? "bg-blue-600 text-white rounded-tr-sm" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-sm"}`}>
                            {isEditingThisNote ? (
                              <div className="space-y-3 w-full sm:w-100">
                                <textarea
                                  value={editingNoteContent}
                                  onChange={(e) =>
                                    setEditingNoteContent(e.target.value)
                                  }
                                  onKeyDown={(e) =>
                                    handleEditNoteKeyDown(e, note.id)
                                  }
                                  className="w-full bg-white/20 dark:bg-slate-900/50 rounded-xl p-3 outline-none border border-transparent focus:border-white/40 resize-y min-h-25"
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={cancelEditingNote}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 transition-colors">
                                    Annuler
                                  </button>
                                  <button
                                    onClick={() => saveEditedNote(note.id)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-blue-600 hover:bg-blue-50 transition-colors">
                                    Enregistrer
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-[14px] sm:text-[15px] whitespace-pre-wrap leading-relaxed">
                                {note.content}
                              </p>
                            )}

                            {isMe && !isReadOnly && !isEditingThisNote && (
                              <div className="mt-2 flex w-fit items-center gap-1 ml-auto sm:ml-0 sm:mt-0 sm:absolute sm:-left-24 sm:top-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 rounded-xl p-0.5">
                                <button
                                  onClick={() => startEditingNote(note)}
                                  aria-label="Modifier la note"
                                  title="Modifier"
                                  className="flex h-10 w-10 items-center justify-center text-slate-400 hover:text-blue-600 rounded-lg">
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => window.confirm("Supprimer cette note ?") && deleteNote(note.id)}
                                  aria-label="Supprimer la note"
                                  title="Supprimer"
                                  className="flex h-10 w-10 items-center justify-center text-slate-400 hover:text-red-500 rounded-lg">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Input en bas */}
                {!isReadOnly && (
                  <form
                    onSubmit={handleSendNote}
                    className="p-3 sm:p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shrink-0">
                    <div className="flex gap-2 sm:gap-3 bg-slate-50 dark:bg-slate-900 p-2 rounded-3xl border border-slate-200 dark:border-slate-700 focus-within:border-blue-400 dark:focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
                      <textarea
                        placeholder="Écris un message..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        onKeyDown={handleNoteComposerKeyDown}
                        disabled={isEditingUsername}
                        rows={1}
                        className="flex-1 bg-transparent resize-none px-3 sm:px-4 py-2 outline-none text-base sm:text-[15px] dark:text-white placeholder:text-slate-400 self-center max-h-32"
                      />
                      <button
                        type="submit"
                        disabled={isEditingUsername || !newNote.trim()}
                        aria-label="Envoyer la note"
                        className="w-11 h-11 shrink-0 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 transition-colors self-end">
                        <Send size={18} className="ml-1" />
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* ONGLET 2 : CHECKLIST */}
            {activeTab === "checklist" && (
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain p-4 sm:p-6 pb-12">
                {COUNTRY_SPECIFIC_SUGGESTIONS[step.country] && (
                  <div className="mb-6 sm:mb-8 bg-linear-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-[20px] p-4 sm:p-5">
                    <div className="flex items-center gap-2 text-sm font-bold text-emerald-800 dark:text-emerald-400 mb-3">
                      <span>💡</span> Suggestions pour : {step.country}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {COUNTRY_SPECIFIC_SUGGESTIONS[step.country].map(
                        (suggestion) => {
                          const isAlreadyAdded = checklist?.some(
                            (item) =>
                              item?.text?.toLowerCase() ===
                              suggestion.toLowerCase(),
                          );
                          if (isAlreadyAdded) return null;
                          return (
                            <button
                              key={suggestion}
                              type="button"
                              disabled={isReadOnly}
                              onClick={async () => {
                                const updatedList = [
                                  ...checklist,
                                  {
                                    id: Date.now().toString(),
                                    text: suggestion,
                                    checked: false,
                                  },
                                ];
                                setChecklist(updatedList);
                                await onUpdateStep(step.id, {
                                  checklist: updatedList,
                                });
                              }}
                              className="min-h-10 bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 px-3 py-1.5 rounded-xl text-left text-xs font-bold transition-colors shadow-sm disabled:opacity-50">
                              + {suggestion}
                            </button>
                          );
                        },
                      )}
                    </div>
                  </div>
                )}

                {!isReadOnly && (
                  <form
                    onSubmit={handleAddChecklistItem}
                    className="mb-6 flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      placeholder="Ajouter une tâche à préparer..."
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      className={`${inputClass} flex-1`}
                    />
                    <button
                      type="submit"
                      disabled={!newChecklistItem.trim()}
                      className="min-h-11 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 rounded-xl font-bold text-sm hover:bg-slate-800 dark:hover:bg-slate-200 disabled:opacity-50 transition-colors shadow-sm w-full sm:w-auto">
                      Ajouter
                    </button>
                  </form>
                )}

                <div className="space-y-2">
                  {checklist.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                      <p className="text-slate-500 font-medium">
                        La checklist est vide.
                      </p>
                    </div>
                  ) : (
                    checklist.map((item) => (
                      <div
                        key={item.id}
                        className={`group flex items-center justify-between p-3 sm:p-4 border rounded-2xl transition-all ${item.checked ? "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm"}`}>
                        <div
                          className={`flex items-center gap-3 sm:gap-4 flex-1 overflow-hidden ${!isReadOnly ? "cursor-pointer" : ""}`}
                          onClick={() => toggleChecklistItem(item.id)}>
                          <div
                            className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${item.checked ? "bg-emerald-500 border-emerald-500" : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600"}`}>
                            {item.checked && (
                              <CheckSquare size={14} className="text-white" />
                            )}
                          </div>
                          <span
                            className={`text-sm sm:text-[15px] transition-all ${item.checked ? "text-slate-400 dark:text-slate-500 line-through" : "text-slate-700 dark:text-slate-200 font-bold"}`}>
                            {item.text}
                          </span>
                        </div>
                        {!isReadOnly && (
                          <button
                            onClick={() => deleteChecklistItem(item.id)}
                            aria-label={`Supprimer "${item.text}"`}
                            title="Supprimer"
                            className="flex h-11 w-11 shrink-0 items-center justify-center text-slate-300 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 ml-1 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ONGLET 3 : ACTIVITÉS */}
            {activeTab === "activities" && (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain p-4 sm:p-6 pb-12">
                  {!isReadOnly && (
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 sm:p-6 shadow-sm mb-6">
                      <div className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <PlusCircle size={18} className="text-blue-500" /> Ajouter
                        une activité
                      </div>

                      <div className="space-y-3">
                        <input
                          type="text"
                          value={newActivityTitle}
                          onChange={(e) => setNewActivityTitle(e.target.value)}
                          placeholder="Intitulé (ex. Plongée)"
                          aria-label="Intitulé de l'activité"
                          className={inputClass}
                        />

                        <div className="grid grid-cols-2 gap-3">
                          <label className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded-xl px-3 bg-slate-50 dark:bg-slate-900/50 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                              Estimé
                            </span>
                            <input
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="0.01"
                              value={newActivityEstimatedPrice}
                              onChange={(e) =>
                                setNewActivityEstimatedPrice(e.target.value)
                              }
                              placeholder="0"
                              className="w-full min-w-0 bg-transparent py-3 text-right font-mono text-base outline-none text-slate-900 dark:text-white"
                            />
                            <span className="text-slate-400 font-bold">€</span>
                          </label>
                          <label className="flex items-center gap-2 border border-emerald-200 dark:border-emerald-800/50 rounded-xl px-3 bg-emerald-50/50 dark:bg-emerald-900/20 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider">
                              Payé
                            </span>
                            <input
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="0.01"
                              value={newActivityPaidPrice}
                              onChange={(e) =>
                                setNewActivityPaidPrice(e.target.value)
                              }
                              placeholder="0"
                              className="w-full min-w-0 bg-transparent py-3 text-right font-mono text-base outline-none text-emerald-700 dark:text-emerald-400 font-bold"
                            />
                            <span className="text-emerald-500 font-bold">€</span>
                          </label>
                        </div>

                        {showNewActivityDetails ? (
                          <>
                            <input
                              type="text"
                              value={newActivityPlace}
                              onChange={(e) =>
                                setNewActivityPlace(e.target.value)
                              }
                              placeholder="Lieu exact (pour la carte)"
                              aria-label="Lieu de l'activité"
                              className={inputClass}
                            />
                            <textarea
                              value={newActivityNotes}
                              onChange={(e) =>
                                setNewActivityNotes(e.target.value)
                              }
                              placeholder="Notes, liens de réservation, horaires..."
                              aria-label="Notes de l'activité"
                              rows="3"
                              className={`${inputClass} min-h-20 resize-y`}
                            />
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowNewActivityDetails(true)}
                            className="min-h-10 text-sm font-bold text-blue-600 dark:text-blue-400">
                            + Lieu et notes
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={addActivity}
                          disabled={!newActivityTitle.trim() || savingActivities}
                          className="min-h-12 w-full bg-slate-900 dark:bg-blue-600 text-white px-6 rounded-xl font-bold text-sm hover:bg-slate-800 dark:hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm sm:w-auto">
                          {savingActivities ? "Enregistrement..." : "Ajouter"}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="mb-1 flex items-baseline justify-between gap-3">
                      <h3 className="font-black text-slate-900 dark:text-white text-lg sm:text-xl">
                        Programme prévu
                      </h3>
                      {activities.length > 0 && (
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          {formatEuros(
                            activities.reduce(
                              (acc, activity) =>
                                acc + (Number.parseFloat(activity.price) || 0),
                              0,
                            ),
                          )}{" "}
                          payés
                        </span>
                      )}
                    </div>

                    {activities.length === 0 ? (
                      <div className="rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-8 sm:p-10 text-center text-slate-500">
                        Aucune activité programmée.
                      </div>
                    ) : (
                      activities.map((activity) => {
                        const isOpen = expandedActivityId === activity.id;
                        const paid = Number.parseFloat(activity.price) || 0;
                        const estimated =
                          Number.parseFloat(
                            activity.estimatedPrice ?? activity.price,
                          ) || 0;
                        return (
                          <div
                            key={activity.id}
                            className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                            {/* Ligne repliée : l'essentiel, un appui pour modifier */}
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedActivityId(isOpen ? null : activity.id)
                              }
                              aria-expanded={isOpen}
                              className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left">
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-bold text-slate-900 dark:text-white">
                                  {activity.title || "Activité sans titre"}
                                </span>
                                {(activity.place || activity.notes) && (
                                  <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                                    {activity.place || activity.notes}
                                  </span>
                                )}
                              </span>
                              <span className="shrink-0 text-right">
                                <span
                                  className={`block text-sm font-black ${paid > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                                  {formatEuros(paid)}
                                </span>
                                <span className="block text-[11px] font-medium text-slate-400">
                                  prévu {formatEuros(estimated)}
                                </span>
                              </span>
                              <ChevronDown
                                size={18}
                                className={`shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                              />
                            </button>

                            {isOpen && (
                              <div className="space-y-3 border-t border-slate-100 dark:border-slate-700 px-4 py-4">
                                <input
                                  type="text"
                                  value={activity.title || ""}
                                  onChange={(e) =>
                                    updateActivityField(
                                      activity.id,
                                      "title",
                                      e.target.value,
                                    )
                                  }
                                  className={`${inputClass} font-bold`}
                                  placeholder="Nom de l'activité"
                                  aria-label="Nom de l'activité"
                                  readOnly={isReadOnly}
                                />

                                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 px-3 rounded-xl border border-slate-200 dark:border-slate-700">
                                  <MapPin
                                    size={18}
                                    className="text-slate-400 shrink-0"
                                  />
                                  <input
                                    type="text"
                                    value={activity.place || ""}
                                    onChange={(e) =>
                                      updateActivityField(
                                        activity.id,
                                        "place",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full min-w-0 bg-transparent py-2.5 text-base sm:text-sm outline-none text-slate-700 dark:text-slate-300"
                                    placeholder="Lieu (pour la carte)"
                                    aria-label="Lieu de l'activité"
                                    readOnly={isReadOnly}
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <label className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 px-3 rounded-xl border border-slate-200 dark:border-slate-700 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                      Estimé
                                    </span>
                                    <input
                                      type="number"
                                      inputMode="decimal"
                                      min="0"
                                      step="0.01"
                                      value={
                                        activity.estimatedPrice ??
                                        activity.price ??
                                        ""
                                      }
                                      onChange={(e) =>
                                        updateActivityField(
                                          activity.id,
                                          "estimatedPrice",
                                          e.target.value,
                                        )
                                      }
                                      className="w-full min-w-0 bg-transparent py-3 text-right font-mono text-base outline-none text-slate-900 dark:text-white"
                                      placeholder="0"
                                      readOnly={isReadOnly}
                                    />
                                    <span className="text-slate-400 font-bold">
                                      €
                                    </span>
                                  </label>
                                  <label className="flex items-center gap-2 bg-emerald-50/50 dark:bg-emerald-900/20 px-3 rounded-xl border border-emerald-100 dark:border-emerald-800/50 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-500">
                                      Payé
                                    </span>
                                    <input
                                      type="number"
                                      inputMode="decimal"
                                      min="0"
                                      step="0.01"
                                      value={activity.price ?? ""}
                                      onChange={(e) =>
                                        updateActivityField(
                                          activity.id,
                                          "price",
                                          e.target.value,
                                        )
                                      }
                                      className="w-full min-w-0 bg-transparent py-3 text-right font-mono text-base outline-none text-emerald-700 dark:text-emerald-400 font-bold"
                                      placeholder="0"
                                      readOnly={isReadOnly}
                                    />
                                    <span className="text-emerald-500 font-bold">
                                      €
                                    </span>
                                  </label>
                                </div>

                                <textarea
                                  value={activity.notes || ""}
                                  onChange={(e) =>
                                    updateActivityField(
                                      activity.id,
                                      "notes",
                                      e.target.value,
                                    )
                                  }
                                  className={`${inputClass} min-h-24 resize-y`}
                                  placeholder="Notes, récit, détails pratiques..."
                                  aria-label="Notes de l'activité"
                                  readOnly={isReadOnly}
                                />

                                {!isReadOnly && (
                                  <button
                                    type="button"
                                    onClick={() => deleteActivity(activity.id)}
                                    disabled={savingActivities}
                                    className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20">
                                    <Trash2 size={16} /> Supprimer l’activité
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Barre d'enregistrement : visible dès qu'une activité est modifiée */}
                {!isReadOnly && activitiesDirty && (
                  <div className="shrink-0 border-t border-slate-200 bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 dark:border-slate-700 dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={handleSaveActivities}
                      disabled={savingActivities}
                      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60">
                      <Save size={18} />
                      {savingActivities
                        ? "Enregistrement..."
                        : "Enregistrer les modifications"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ONGLET 4 : LOGISTIQUE */}
            {activeTab === "logistics" && (
              <form
                onSubmit={handleSaveLogistics}
                className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain p-4 sm:p-6 pb-12 flex flex-col">
                <div className="bg-linear-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-3 sm:p-5 rounded-3xl border border-blue-100 dark:border-blue-800/50 mb-4 sm:mb-8 shadow-sm shrink-0">
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <label className="text-sm font-black text-blue-900 dark:text-blue-400 flex items-center gap-2 uppercase tracking-wider">
                      <Calculator size={16} /> Convertisseur
                    </label>
                    <span className="text-[10px] font-bold bg-white dark:bg-slate-800 px-2 py-1 rounded-full text-slate-500 shadow-sm hidden sm:inline-block">
                      Taux du jour
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <div className="flex flex-1 w-full bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        placeholder="Montant..."
                        aria-label="Montant en monnaie locale"
                        value={localAmount}
                        onChange={(e) => setLocalAmount(e.target.value)}
                        className="flex-1 w-1/2 sm:w-auto bg-transparent px-3 sm:px-4 py-3 text-lg font-black text-slate-900 dark:text-white outline-none"
                      />
                      <select
                        value={localCurrency}
                        onChange={(e) => setLocalCurrency(e.target.value)}
                        aria-label="Devise"
                        className="bg-slate-50 dark:bg-slate-900 px-2 sm:px-4 py-3 text-base sm:text-sm font-bold text-slate-600 dark:text-slate-300 border-l border-slate-200 dark:border-slate-700 outline-none cursor-pointer">
                        {CURRENCIES.filter((code) => code !== "EUR").map(
                          (code) => (
                            <option key={code} value={code}>
                              {code}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                    <div className="hidden text-slate-400 sm:block">
                      <ArrowLeft size={20} />
                    </div>
                    <div className="flex-1 w-full sm:bg-white sm:dark:bg-slate-800 sm:border border-slate-200 dark:border-slate-700 rounded-xl px-1 sm:px-4 sm:py-3 sm:shadow-sm flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                        = en euros
                      </span>
                      <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                        {!exchangeRates ? (
                          <Loader2 size={20} className="animate-spin" />
                        ) : (
                          formatEuros(convertedAmount)
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 sm:space-y-6 flex-1">
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-4 sm:p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-4">
                      <label className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Hotel size={20} className="text-orange-500" />{" "}
                        Hébergement
                      </label>
                      <StatusBadgeSelector
                        currentStatus={lodgingStatus}
                        onChange={setLodgingStatus}
                        disabled={isReadOnly}
                      />
                    </div>
                    <textarea
                      value={lodging}
                      onChange={(e) => setLodging(e.target.value)}
                      disabled={isReadOnly}
                      placeholder="Nom de l'hôtel, adresse, lien de réservation..."
                      rows="4"
                      className={`${inputClass} min-h-25 resize-y`}
                    />
                    {renderPriceInputs(
                      lodgingPriceEstimated,
                      setLodgingPriceEstimated,
                      lodgingPricePaid,
                      setLodgingPricePaid,
                    )}
                  </div>

                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-4 sm:p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-4">
                      <label className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Plane size={20} className="text-blue-500" /> Transport
                      </label>
                      <StatusBadgeSelector
                        currentStatus={transportStatus}
                        onChange={setTransportStatus}
                        disabled={isReadOnly}
                      />
                    </div>
                    <textarea
                      value={transport}
                      onChange={(e) => setTransport(e.target.value)}
                      disabled={isReadOnly}
                      placeholder="Numéro de vol, horaires, lieu de rendez-vous..."
                      rows="4"
                      className={`${inputClass} min-h-25 resize-y`}
                    />
                    {renderPriceInputs(
                      transportPriceEstimated,
                      setTransportPriceEstimated,
                      transportPricePaid,
                      setTransportPricePaid,
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-4 sm:p-6 shadow-sm">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 mb-3">
                        <Wallet size={16} /> Autres frais prévus (Étape)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={budget}
                          onChange={(e) => setBudget(e.target.value)}
                          disabled={isReadOnly}
                          className="min-h-11 w-full bg-transparent text-2xl sm:text-3xl font-black text-slate-900 dark:text-white outline-none border-b-2 border-transparent focus:border-blue-500 transition-colors"
                        />
                        <span className="text-xl font-black text-slate-400">
                          €
                        </span>
                      </div>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-3xl p-4 sm:p-6 shadow-sm">
                      <label className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-2 mb-3">
                        <CheckCircle size={16} /> Autres frais payés
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={budgetSpent}
                          onChange={(e) => setBudgetSpent(e.target.value)}
                          disabled={isReadOnly}
                          className="min-h-11 w-full bg-transparent text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-400 outline-none border-b-2 border-transparent focus:border-emerald-500 transition-colors"
                        />
                        <span className="text-xl font-black text-emerald-500/50">
                          €
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                </div>

                {/* Pied fixe : le bouton reste sous le pouce, sans avoir à
                    faire défiler toute la fiche pour enregistrer. */}
                {!isReadOnly && (
                  <div className="flex shrink-0 items-center gap-3 border-t border-slate-200 bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 dark:border-slate-700 dark:bg-slate-800 sm:justify-end sm:px-6">
                    {logisticsDirty && (
                      <span className="hidden text-xs font-bold text-amber-600 dark:text-amber-400 sm:inline">
                        Modifications non enregistrées
                      </span>
                    )}
                    <button
                      type="submit"
                      disabled={!logisticsDirty}
                      className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-8 text-sm font-bold transition-colors sm:w-auto ${logisticsDirty ? "bg-sky-600 text-white shadow-lg hover:bg-sky-700" : logisticsSaved ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-400"}`}>
                      {logisticsSaved && !logisticsDirty ? (
                        <>
                          <Check size={18} /> Enregistré
                        </>
                      ) : (
                        <>
                          <Save size={18} />{" "}
                          {logisticsDirty ? "Enregistrer" : "Rien à enregistrer"}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </form>
            )}

            {/* ONGLET 5 : DOCUMENTS */}
            {activeTab === "documents" && (
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain p-4 sm:p-6 pb-12">
                {!isReadOnly && (
                  <div className="mb-6 sm:mb-8">
                    <label className="flex flex-col items-center justify-center w-full h-32 sm:h-40 border-2 border-slate-300 dark:border-slate-700 border-dashed rounded-3xl sm:rounded-[28px] cursor-pointer bg-slate-50 hover:bg-blue-50 hover:border-blue-300 dark:bg-slate-800/50 dark:hover:bg-slate-800 dark:hover:border-blue-500 transition-all group">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {uploading ? (
                          <Loader2
                            size={32}
                            className="text-blue-500 animate-spin mb-3"
                          />
                        ) : (
                          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white dark:bg-slate-700 rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <UploadCloud size={24} className="text-blue-500" />
                          </div>
                        )}
                        <p className="text-sm sm:text-base font-bold text-slate-700 dark:text-slate-300 text-center px-4">
                          Clique pour uploader un document
                        </p>
                        <p className="text-[11px] sm:text-xs font-medium text-slate-400 mt-1">
                          PDF, JPG, PNG (Max 5MB)
                        </p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,image/*"
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                    </label>
                  </div>
                )}

                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-3 sm:mb-4">
                    <FileText size={16} /> Fichiers stockés
                  </h3>
                  {loadingDocs ? (
                    <div className="flex justify-center py-10">
                      <Loader2
                        className="animate-spin text-blue-500"
                        size={32}
                      />
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl">
                      <p className="text-slate-500 font-medium">
                        Aucun document sauvegardé.
                      </p>
                    </div>
                  ) : (
                    documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[20px] shadow-sm hover:shadow-md transition-shadow gap-4">
                        <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                          <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-xl text-blue-600 dark:text-blue-400 shrink-0">
                            <FileText size={20} className="sm:w-6 sm:h-6" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 truncate">
                              {doc.file_name}
                            </p>
                            <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 mt-0.5 uppercase tracking-wider">
                              {formatNoteDate(doc.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 shrink-0">
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 sm:p-3 text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 dark:bg-slate-900/50 dark:hover:bg-blue-900/30 rounded-xl transition-colors flex items-center gap-2"
                            title="Télécharger">
                            <Download size={18} />{" "}
                            <span className="text-xs font-bold sm:hidden">
                              Ouvrir
                            </span>
                          </a>
                          {!isReadOnly && (
                            <button
                              onClick={() =>
                                deleteDocument(doc.id, doc.file_url)
                              }
                              aria-label={`Supprimer ${doc.file_name}`}
                              title="Supprimer"
                              className="p-2 sm:p-3 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 dark:bg-slate-900/50 dark:hover:bg-red-900/30 rounded-xl transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 flex items-center gap-2">
                              <Trash2 size={18} />{" "}
                              <span className="text-xs font-bold sm:hidden">
                                Suppr.
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
