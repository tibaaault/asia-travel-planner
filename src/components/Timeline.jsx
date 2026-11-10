import { useState, useMemo, useEffect, useRef } from "react";
import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  GripVertical,
  MapPin,
  Calendar,
  PlaneTakeoff,
  Trash2,
  Loader2,
  Printer,
  Backpack,
  Map,
  ChevronDown,
  ChevronRight,
  FoldVertical,
  UnfoldVertical,
  MoreVertical,
  Plus,
  X,
} from "lucide-react";
import AddStepForm from "./AddStepForm";
import StepModal from "./StepModal";
import TripSummary from "./TripSummary";
import TodayCard from "./TodayCard";
import Auth from "./Auth";
import { formatDaysNights } from "../utils/duration";
import { getTopLevelSteps } from "../utils/budget";
import { formatShortDate as formatDate } from "../utils/dates";
import { useMediaQuery } from "../hooks/useMediaQuery";

// Leaflet + react-leaflet pèsent lourd dans le bundle : chargés à la demande
// plutôt qu'au premier affichage de la page (l'essentiel du chargement
// initial devient plus léger, notamment en mobile/à l'étranger).
const RouteMap = React.lazy(() => import("./RouteMap"));

// Résumé visuel du statut logistique (hébergement + transport) d'une étape,
// pour repérer en un coup d'œil ce qui reste à réserver sans ouvrir la
// modale de détail.
const LOGISTICS_SUMMARY = {
  A_RESERVER: {
    label: "À réserver",
    className:
      "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  },
  RESERVE: {
    label: "Réservé",
    className:
      "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  },
  PAYE: {
    label: "Tout réglé",
    className:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  },
};

const getLogisticsSummary = (step) => {
  const lodging = step.lodging_status || "A_RESERVER";
  const transport = step.transport_status || "A_RESERVER";
  if (lodging === "A_RESERVER" || transport === "A_RESERVER") {
    return LOGISTICS_SUMMARY.A_RESERVER;
  }
  if (lodging === "PAYE" && transport === "PAYE") {
    return LOGISTICS_SUMMARY.PAYE;
  }
  return LOGISTICS_SUMMARY.RESERVE;
};

const LogisticsBadge = ({ step, className = "" }) => {
  const summary = getLogisticsSummary(step);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${summary.className} ${className}`}>
      {summary.label}
    </span>
  );
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

// Ouvre la fiche au clic ou au clavier, comme un bouton.
const openOnKey = (open) => (e) => {
  if (e.target !== e.currentTarget) return;
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    open();
  }
};

export default function Timeline({
  session,
  trip,
  stepsWithDates,
  progress,
  mobileView = "list",
  onOpenBackpack,
  onQuickAdd,
}) {
  const {
    steps,
    loading,
    tripStartDate,
    updateTripStartDate,
    addStep,
    deleteStep,
    updateStepsOrder,
    updateStep,
  } = trip;
  const [selectedStep, setSelectedStep] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // 🗂️ ÉTAT POUR L'ACCORDÉON (Liste des IDs des étapes mères pliées)
  const [collapsedParents, setCollapsedParents] = useState(new Set());
  // 🗓️ ÉTAT POUR L'ACCORDÉON PAR SEMAINE (index de semaine plié)
  const [collapsedWeeks, setCollapsedWeeks] = useState(new Set());
  const hasInitializedWeeksRef = useRef(false);

  const isReadOnly = !session;
  // Sur téléphone, la liste et la carte sont deux onglets distincts ; à
  // partir de la tablette en paysage, elles s'affichent ensemble.
  const isWide = useMediaQuery("(min-width: 1024px)");
  const showList = isWide || mobileView === "list";
  const showMap = isWide || mobileView === "map";

  const currentStepId =
    progress.status === "ongoing" ? progress.current.id : null;
  const currentExcursionId =
    progress.status === "ongoing" ? progress.excursion?.id : null;
  const isPastStep = (step) =>
    progress.status === "after" ||
    (progress.status === "ongoing" &&
      step.position < progress.current.position);

  // --- LOGIQUE ACCORDÉON ---
  const toggleParent = (parentId, e) => {
    e.stopPropagation();
    const newCollapsed = new Set(collapsedParents);
    if (newCollapsed.has(parentId)) newCollapsed.delete(parentId);
    else newCollapsed.add(parentId);
    setCollapsedParents(newCollapsed);
  };

  const handleAddStep = (newStep) => {
    addStep(newStep);
    setIsAddOpen(false);
  };
  const handleDeleteStep = (idToRemove) => {
    if (!window.confirm("Supprimer cette étape et tout ce qui y est rattaché ?")) return false;
    deleteStep(idToRemove);
    return true;
  };

  const handleDragEnd = (result) => {
    if (!result.destination || isReadOnly) return;
    const { destination, draggableId } = result;

    let workingSteps = [...steps].sort((a, b) => a.position - b.position);
    const draggedStep = workingSteps.find((s) => s.id === draggableId);
    if (!draggedStep) return;

    const newParentId = destination.droppableId === "ROOT" ? null : destination.droppableId.replace("PARENT_", "");
    const childrenOfDragged = workingSteps.filter((s) => s.parent_id === draggedStep.id);

    if (newParentId !== null && childrenOfDragged.length > 0) {
      alert("Impossible ! Transférez d'abord les excursions de ce camp de base avant de le transformer lui-même en excursion.");
      return;
    }

    draggedStep.parent_id = newParentId;
    workingSteps = workingSteps.filter((s) => s.id !== draggableId);

    const parents = workingSteps.filter((s) => !s.parent_id);
    const getChildren = (pid) => workingSteps.filter((s) => s.parent_id === pid);

    if (newParentId === null) {
      parents.splice(destination.index, 0, draggedStep);
    }

    let finalFlatList = [];
    parents.forEach((p) => {
      finalFlatList.push(p);
      let children = getChildren(p.id);
      if (newParentId === p.id) {
        children.splice(destination.index, 0, draggedStep);
      }
      finalFlatList.push(...children);
    });

    finalFlatList = finalFlatList.map((s, idx) => ({ ...s, position: idx }));
    updateStepsOrder(finalFlatList);
  };

  const parentSteps = stepsWithDates.filter((s) => !s.parent_id || s.parent_id === "null");
  const travelSteps = getTopLevelSteps(stepsWithDates);
  const getChildrenForParent = (parentId) => stepsWithDates.filter((s) => s.parent_id === parentId);

  // 🗓️ REGROUPEMENT DES ÉTAPES MÈRES PAR SEMAINE DE VOYAGE (calculé depuis
  // les dates, sans toucher aux données) — une longue liste d'étapes se
  // replie ainsi par blocs de 7 jours, comme les "Semaine 1 / Semaine 2"
  // qu'on note naturellement en préparant un voyage.
  const weekGroups = useMemo(() => {
    if (parentSteps.length === 0) return [];
    const tripStart = new Date(tripStartDate);
    tripStart.setHours(0, 0, 0, 0);

    // (objet simple plutôt qu'un Map JS : l'icône lucide-react "Map" est
    // déjà importée sous ce nom dans ce fichier et masque le constructeur natif)
    const groupsByWeek = {};
    parentSteps.forEach((step, index) => {
      const daysFromStart = Math.floor((step.computedStartDate - tripStart) / 86400000);
      const weekIndex = Math.max(0, Math.floor(daysFromStart / 7));
      if (!groupsByWeek[weekIndex]) groupsByWeek[weekIndex] = [];
      groupsByWeek[weekIndex].push({ step, index });
    });

    return Object.keys(groupsByWeek)
      .map(Number)
      .sort((a, b) => a - b)
      .map((weekIndex) => {
        const items = groupsByWeek[weekIndex];
        return {
          weekIndex,
          label: `Semaine ${weekIndex + 1}`,
          items,
          startDate: items[0].step.computedStartDate,
          endDate: items[items.length - 1].step.computedEndDate,
        };
      });
  }, [parentSteps, tripStartDate]);

  // Au premier chargement, seule la semaine en cours reste dépliée (la
  // 1ère si le voyage n'a pas commencé) : en route, on ouvre l'app pour
  // voir où l'on en est, pas le début du voyage.
  useEffect(() => {
    if (!hasInitializedWeeksRef.current && weekGroups.length > 1) {
      const currentWeek = weekGroups.find((g) =>
        g.items.some(({ step }) => step.id === currentStepId),
      );
      const openWeekIndex = (currentWeek || weekGroups[0]).weekIndex;
      setCollapsedWeeks(
        new Set(
          weekGroups
            .filter((g) => g.weekIndex !== openWeekIndex)
            .map((g) => g.weekIndex),
        ),
      );
      hasInitializedWeeksRef.current = true;
    }
  }, [weekGroups, currentStepId]);

  const toggleWeek = (weekIndex) => {
    const next = new Set(collapsedWeeks);
    if (next.has(weekIndex)) next.delete(weekIndex);
    else next.add(weekIndex);
    setCollapsedWeeks(next);
  };

  const allWeeksCollapsed = weekGroups.length > 0 && collapsedWeeks.size >= weekGroups.length;

  const toggleAll = () => {
    if (allWeeksCollapsed) {
      setCollapsedWeeks(new Set()); // Tout déplier
      setCollapsedParents(new Set());
    } else {
      setCollapsedWeeks(new Set(weekGroups.map((g) => g.weekIndex))); // Tout plier
      const allParentIds = steps.filter((s) => !s.parent_id).map((s) => s.id);
      setCollapsedParents(new Set(allParentIds));
    }
  };

  const visaStats = useMemo(() => {
    const countryStays = {};
    travelSteps.forEach((step) => {
      if (!countryStays[step.country]) countryStays[step.country] = 0;
      countryStays[step.country] += Number(step.duration || 0);
    });
    // La durée est en nuits ; un visa compte les jours de présence,
    // arrivée et départ inclus : une nuit de plus.
    Object.keys(countryStays).forEach((country) => {
      countryStays[country] += 1;
    });
    return countryStays;
  }, [travelSteps]);

  const totalDistance = useMemo(() => {
    let distance = 0;
    for (let index = 1; index < travelSteps.length; index += 1) {
      const previous = travelSteps[index - 1];
      const current = travelSteps[index];
      if (!previous?.lat || !previous?.lng || !current?.lat || !current?.lng) continue;
      distance += calculateDistance(previous.lat, previous.lng, current.lat, current.lng);
    }
    return distance;
  }, [travelSteps]);

  // On repart des données fraîches (steps) mais on raccroche la date
  // calculée (stepsWithDates) : StepModal en a besoin pour aller chercher
  // la météo typique de la bonne période plutôt que la météo du jour.
  const freshActiveStep = steps.find((s) => s.id === selectedStep?.id);
  const computedActiveStep = stepsWithDates.find((s) => s.id === selectedStep?.id);
  const activeStepInModal = freshActiveStep
    ? {
        ...freshActiveStep,
        computedStartDate: computedActiveStep?.computedStartDate,
        computedEndDate: computedActiveStep?.computedEndDate,
      }
    : selectedStep;

  if (loading)
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );

  return (
    <div className="w-full">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)] xl:items-start xl:gap-8">

          {/* ================= GAUCHE : TIMELINE ================= */}
          {showList && (
          <div className="flex w-full min-w-0 flex-col gap-4 print:w-full sm:gap-6">

            <TodayCard
              progress={progress}
              steps={steps}
              onOpenStep={setSelectedStep}
              onQuickAdd={onQuickAdd}
            />

            {/* EN-TÊTE (grand écran) : sur téléphone, la date de départ, le
                sac, l'export et le compte sont dans l'onglet "Plus". */}
            <div className="hidden flex-col justify-between gap-4 rounded-[28px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] backdrop-blur lg:flex xl:flex-row xl:items-end dark:border-slate-700 dark:bg-slate-900/85 print:flex">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 mb-3">
                  <MapPin size={13} /> {isReadOnly ? "Itinéraire partagé" : "Édition active"}
                </div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  Mon itinéraire
                </h1>
                <p className="mt-2 max-w-xl text-sm text-slate-500 dark:text-slate-400">
                  Visualise et organise tes camps de base. Clic sur une étape pour en voir les détails ou la modifier.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 print:hidden">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-950/60">
                  <PlaneTakeoff size={16} className="text-slate-400" />
                  <input
                    type="date"
                    value={tripStartDate}
                    onChange={(e) => updateTripStartDate(e.target.value)}
                    disabled={isReadOnly}
                    title="Date de début du voyage"
                    className="bg-transparent text-sm font-bold text-slate-700 outline-none dark:text-slate-200 cursor-pointer"
                  />
                </div>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/80 transition-all">
                  <Printer size={16} /> Export
                </button>
                <button
                  onClick={onOpenBackpack}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-all">
                  <Backpack size={16} /> Sac
                </button>
                <div className="ml-2">
                  <Auth session={session} />
                </div>
              </div>
            </div>

            {!isReadOnly && isAddOpen && (
              <div className="print:hidden">
                <AddStepForm onAddStep={handleAddStep} parentSteps={parentSteps} />
              </div>
            )}

            {/* TIMELINE CONTAINER (BLOC STRUCTURÉ) */}
            <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-3 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] backdrop-blur dark:border-slate-700 dark:bg-slate-900/85 sm:p-6">

              <div className="mb-3 flex items-center justify-between gap-2 px-1 sm:mb-5 sm:px-0">
                <span className="whitespace-nowrap text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  {steps.length} Étape{steps.length > 1 ? 's' : ''}
                  <span className="hidden sm:inline"> planifiée{steps.length > 1 ? 's' : ''}</span>
                </span>
                <div className="flex items-center gap-1 print:hidden">
                  {parentSteps.length > 0 && (
                    <button
                      onClick={toggleAll}
                      aria-label={allWeeksCollapsed ? "Tout déplier" : "Tout plier"}
                      className="inline-flex min-h-10 min-w-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10 transition-colors"
                    >
                      {allWeeksCollapsed ? <UnfoldVertical size={14}/> : <FoldVertical size={14}/>}
                      <span className="hidden min-[360px]:inline">{allWeeksCollapsed ? "Tout déplier" : "Tout plier"}</span>
                    </button>
                  )}
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => setIsAddOpen((open) => !open)}
                      aria-expanded={isAddOpen}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-slate-900 px-3 text-xs font-bold text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 transition-colors"
                    >
                      {isAddOpen ? <><X size={14}/> Fermer</> : <><Plus size={14} strokeWidth={3}/> Étape</>}
                    </button>
                  )}
                </div>
              </div>

              {steps.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-10 text-center dark:border-slate-700 dark:bg-slate-800/50">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Aucune étape pour le moment. Ajoute ton premier camp de base avec le bouton « Étape » !</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Ligne verticale de la timeline */}
                  <div className="absolute left-[9px] top-4 bottom-4 w-[2px] bg-slate-200 dark:bg-slate-700 print:hidden z-0 rounded-full sm:left-[21px]"></div>

                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="ROOT" type="STEP" isDropDisabled={isReadOnly}>
                      {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                          {weekGroups.map((group) => {
                            const isWeekCollapsed = collapsedWeeks.has(group.weekIndex);
                            const isCurrentWeek = group.items.some(({ step }) => step.id === currentStepId);
                            return (
                              <div key={group.weekIndex}>
                                {weekGroups.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => toggleWeek(group.weekIndex)}
                                    aria-expanded={!isWeekCollapsed}
                                    className="relative z-10 mb-2 flex min-h-11 w-full items-center justify-between gap-2 rounded-xl bg-slate-100/90 px-3 text-left transition-colors hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700/80"
                                  >
                                    <span className="flex min-w-0 items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
                                      {isWeekCollapsed ? <ChevronRight size={14} className="shrink-0" /> : <ChevronDown size={14} className="shrink-0" />}
                                      <span className="shrink-0">{group.label}</span>
                                      <span className="truncate font-medium normal-case tracking-normal text-slate-400 dark:text-slate-500">
                                        {formatDate(group.startDate)} - {formatDate(group.endDate)}
                                      </span>
                                    </span>
                                    {isCurrentWeek ? (
                                      <span className="shrink-0 rounded-full bg-sky-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                                        En cours
                                      </span>
                                    ) : (
                                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                        {group.items.length} étape{group.items.length > 1 ? 's' : ''}
                                      </span>
                                    )}
                                  </button>
                                )}

                                <div className={isWeekCollapsed ? "hidden" : "space-y-3"}>
                                  {group.items.map(({ step: parentStep, index }) => {
                            const excursions = getChildrenForParent(parentStep.id);
                            const isCollapsed = collapsedParents.has(parentStep.id);
                            const canToggle = excursions.length > 0;
                            const isCurrent = parentStep.id === currentStepId;
                            const isPast = isPastStep(parentStep);
                            const openParent = () => setSelectedStep(parentStep);

                            return (
                              <Draggable key={parentStep.id} draggableId={parentStep.id} index={index} isDragDisabled={isReadOnly}>
                                {(provided, snapshot) => (
                                  <div ref={provided.innerRef} {...provided.draggableProps} className="relative pl-6 print:pl-0 sm:pl-11">

                                    {/* Point sur la timeline : gris = passé, halo = en cours */}
                                    <div className={`absolute left-[3px] top-5 z-10 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900 shadow-sm print:hidden transition-colors sm:left-[15px] ${isCurrent ? 'bg-sky-500 ring-4 ring-sky-200 dark:ring-sky-500/30' : isPast ? 'bg-slate-300 dark:bg-slate-600' : 'bg-blue-500'}`} />

                                    <div className={`transition-all ${snapshot.isDragging ? "opacity-90 z-50 scale-[1.02]" : ""}`}>

                                      {/* CARTE CAMP DE BASE : un appui ouvre la fiche */}
                                      <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={openParent}
                                        onKeyDown={openOnKey(openParent)}
                                        className={`group flex cursor-pointer items-center gap-1 rounded-2xl border bg-white p-2 shadow-sm transition-all hover:shadow-md active:bg-slate-50 dark:bg-slate-800 dark:active:bg-slate-700/60 sm:gap-2 sm:p-3 ${snapshot.isDragging ? "border-blue-400 shadow-lg ring-2 ring-blue-100 dark:ring-blue-900/50" : isCurrent ? "border-sky-400 ring-2 ring-sky-100 dark:border-sky-500 dark:ring-sky-500/20" : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"}`}
                                      >
                                        {!isReadOnly && (
                                          <div {...provided.dragHandleProps} aria-label="Déplacer l'étape" className="flex h-11 w-8 shrink-0 cursor-grab items-center justify-center text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 print:hidden" onClick={(e) => e.stopPropagation()}>
                                            <GripVertical size={18} />
                                          </div>
                                        )}
                                        <div className={`min-w-0 flex-1 ${isReadOnly ? "pl-2" : ""}`}>
                                          <div className="flex flex-wrap items-baseline gap-x-2">
                                            <h3 className={`text-base font-black leading-tight ${isPast ? "text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-white"}`}>
                                              {parentStep.city}
                                            </h3>
                                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                              {parentStep.country}
                                            </span>
                                          </div>
                                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                                            <span className="flex items-center gap-1"><Calendar size={12}/> {formatDate(parentStep.computedStartDate)} - {formatDate(parentStep.computedEndDate)}</span>
                                            <span className="text-blue-600 dark:text-blue-400 font-bold">{formatDaysNights(parentStep.duration, { compact: true })}</span>
                                            {isCurrent ? (
                                              <span className="inline-flex items-center rounded-full bg-sky-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Tu es ici</span>
                                            ) : (
                                              !isPast && <LogisticsBadge step={parentStep} />
                                            )}
                                          </div>
                                        </div>

                                        <div className="flex shrink-0 items-center gap-1 print:hidden">
                                          {!isReadOnly && (
                                            <button
                                              onClick={(e) => { e.stopPropagation(); handleDeleteStep(parentStep.id); }}
                                              className="hidden h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 sm:flex"
                                              title="Supprimer"
                                              aria-label={`Supprimer ${parentStep.city}`}
                                            >
                                              <Trash2 size={18} />
                                            </button>
                                          )}
                                          {canToggle ? (
                                            <button
                                              type="button"
                                              onClick={(e) => toggleParent(parentStep.id, e)}
                                              aria-expanded={!isCollapsed}
                                              aria-label={`${isCollapsed ? "Afficher" : "Masquer"} les ${excursions.length} excursions`}
                                              className="inline-flex h-11 items-center gap-0.5 rounded-xl bg-slate-100 px-2.5 text-xs font-black text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                                            >
                                              {excursions.length}
                                              {isCollapsed ? <ChevronRight size={16}/> : <ChevronDown size={16}/>}
                                            </button>
                                          ) : (
                                            <ChevronRight size={18} className="mx-1 text-slate-300 dark:text-slate-600" />
                                          )}
                                        </div>
                                      </div>

                                      {/* ZONE DROPPABLE POUR EXCURSIONS (Visible seulement si déplié) */}
                                      {!isCollapsed && (
                                        <Droppable droppableId={`PARENT_${parentStep.id}`} type="STEP" isDropDisabled={isReadOnly}>
                                          {(providedChild, snapshotChild) => (
                                            <div
                                              ref={providedChild.innerRef}
                                              {...providedChild.droppableProps}
                                              className={`ml-5 mt-2 space-y-2 relative before:absolute before:top-0 before:bottom-4 before:-left-[15px] before:w-[2px] before:bg-slate-200 dark:before:bg-slate-700 before:rounded-b-full transition-colors sm:ml-6 ${snapshotChild.isDraggingOver ? "bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-2 -mx-2" : excursions.length > 0 ? "py-1" : ""}`}
                                            >
                                              {excursions.map((excursion, childIndex) => {
                                                const openExcursion = () => setSelectedStep(excursion);
                                                const isCurrentExcursion = excursion.id === currentExcursionId;
                                                return (
                                                <Draggable key={excursion.id} draggableId={excursion.id} index={childIndex} isDragDisabled={isReadOnly}>
                                                  {(providedEx, snapEx) => (
                                                    <div
                                                      ref={providedEx.innerRef}
                                                      {...providedEx.draggableProps}
                                                      className="relative"
                                                    >
                                                      {/* Connecteur horizontal pour l'enfant */}
                                                      <div className="absolute top-1/2 -left-[15px] w-[15px] h-[2px] bg-slate-200 dark:bg-slate-700 -translate-y-1/2"></div>

                                                      <div
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={openExcursion}
                                                        onKeyDown={openOnKey(openExcursion)}
                                                        className={`flex cursor-pointer items-center justify-between rounded-xl border bg-white p-2 shadow-sm transition-all active:bg-slate-50 dark:bg-slate-800/80 dark:active:bg-slate-700/60 sm:p-3 ${snapEx.isDragging ? "border-blue-400 shadow-md ring-2 ring-blue-100 z-50 scale-[1.02]" : isCurrentExcursion ? "border-sky-400 dark:border-sky-500" : "border-slate-100 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-500"}`}>
                                                        <div className="flex min-w-0 items-center gap-2 overflow-hidden sm:gap-3">
                                                          {!isReadOnly && (
                                                            <div {...providedEx.dragHandleProps} aria-label="Déplacer l'excursion" className="flex h-10 w-7 shrink-0 cursor-grab items-center justify-center text-slate-300 hover:text-slate-500 print:hidden" onClick={(e) => e.stopPropagation()}>
                                                              <MoreVertical size={16} />
                                                            </div>
                                                          )}
                                                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                            <Map size={14} />
                                                          </div>
                                                          <div className="min-w-0">
                                                            <h4 className="truncate text-sm font-bold text-slate-800 dark:text-slate-200">
                                                              {excursion.city}
                                                            </h4>
                                                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-slate-500">
                                                              <span>{formatDaysNights(excursion.duration, { compact: true })} • {formatDate(excursion.computedStartDate)}</span>
                                                              {isCurrentExcursion ? (
                                                                <span className="inline-flex items-center rounded-full bg-sky-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Aujourd’hui</span>
                                                              ) : (
                                                                !isPast && <LogisticsBadge step={excursion} />
                                                              )}
                                                            </div>
                                                          </div>
                                                        </div>

                                                        <div className="ml-2 flex shrink-0 items-center gap-1 print:hidden">
                                                          {!isReadOnly && (
                                                            <button
                                                              onClick={(e) => { e.stopPropagation(); handleDeleteStep(excursion.id); }}
                                                              className="hidden h-10 w-10 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 sm:flex"
                                                              title="Supprimer"
                                                              aria-label={`Supprimer ${excursion.city}`}
                                                            >
                                                              <Trash2 size={16} />
                                                            </button>
                                                          )}
                                                          <ChevronRight size={16} className="text-slate-300 dark:text-slate-600" />
                                                        </div>
                                                      </div>
                                                    </div>
                                                  )}
                                                </Draggable>
                                                );
                                              })}
                                              {providedChild.placeholder}
                                            </div>
                                          )}
                                        </Droppable>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                </div>
              )}
            </div>
          </div>
          )}

          {/* ================= DROITE : MAP & SUMMARY ================= */}
          <div className="flex w-full min-w-0 flex-col gap-4 print:hidden sm:gap-6 xl:sticky xl:top-6">
            {showList && steps.length > 0 && (
              <TripSummary steps={stepsWithDates} visaStats={visaStats} totalDistance={totalDistance} />
            )}

            {showMap && (
            <div className="h-[calc(100dvh-12rem)] min-h-80 w-full overflow-hidden rounded-[28px] border border-slate-200/80 shadow-sm dark:border-slate-700 lg:h-[600px] bg-slate-200 dark:bg-slate-800">
              <React.Suspense
                fallback={
                  <div className="flex h-full w-full items-center justify-center">
                    <Loader2 className="animate-spin text-blue-500" size={28} />
                  </div>
                }>
                <RouteMap steps={stepsWithDates} />
              </React.Suspense>
            </div>
            )}
          </div>
      </div>

      {selectedStep && (
        <StepModal
          step={activeStepInModal || selectedStep}
          onClose={() => setSelectedStep(null)}
          onUpdateStep={updateStep}
          onDeleteStep={(id) => {
            if (handleDeleteStep(id)) setSelectedStep(null);
          }}
          isReadOnly={isReadOnly}
        />
      )}
    </div>
  );
}
