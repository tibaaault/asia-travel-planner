import { useState, useMemo, useEffect } from "react";
import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  GripVertical,
  MapPin,
  Calendar,
  PlaneTakeoff,
  Trash2,
  Loader2,
  Eye,
  Printer,
  Backpack,
  Map,
  ChevronDown,
  ChevronRight,
  FoldVertical,
  UnfoldVertical,
  MoreVertical
} from "lucide-react";
import AddStepForm from "./AddStepForm";
import { useSteps } from "../hooks/useSteps";
import StepModal from "./StepModal";
import RouteMap from "./RouteMap";
import TripSummary from "./TripSummary";
import { supabase } from "../config/supabaseClient";
import Auth from "./Auth";
import BackpackModal from "./BackpackModal";
import { formatDaysNights } from "../utils/duration";
import { getTopLevelSteps } from "../utils/budget";

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

export default function Timeline() {
  const {
    steps,
    loading,
    tripStartDate,
    updateTripStartDate,
    addStep,
    deleteStep,
    updateStepsOrder,
    updateStep,
  } = useSteps();
  const [session, setSession] = useState(null);
  const [selectedStep, setSelectedStep] = useState(null);
  const [isBackpackOpen, setIsBackpackOpen] = useState(false);
  
  // 🗂️ ÉTAT POUR L'ACCORDÉON (Liste des IDs des étapes mères pliées)
  const [collapsedParents, setCollapsedParents] = useState(new Set());
  
  const isReadOnly = !session;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  // --- LOGIQUE ACCORDÉON ---
  const toggleParent = (parentId, e) => {
    e.stopPropagation();
    const newCollapsed = new Set(collapsedParents);
    if (newCollapsed.has(parentId)) newCollapsed.delete(parentId);
    else newCollapsed.add(parentId);
    setCollapsedParents(newCollapsed);
  };

  const toggleAll = () => {
    if (collapsedParents.size > 0) {
      setCollapsedParents(new Set()); // Tout déplier
    } else {
      const allParentIds = steps.filter(s => !s.parent_id).map(s => s.id);
      setCollapsedParents(new Set(allParentIds)); // Tout plier
    }
  };

  const handleAddStep = (newStep) => addStep(newStep);
  const handleDeleteStep = (idToRemove) => {
    if (window.confirm("Supprimer cette étape et tout ce qui y est rattaché ?")) deleteStep(idToRemove);
  };

  const handleDragEnd = (result) => {
    if (!result.destination || isReadOnly) return;
    const { source, destination, draggableId } = result;

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

  const formatDate = (date) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(date);

  const stepsWithDates = useMemo(() => {
    let currentDate = new Date(tripStartDate);
    const sortedSteps = [...steps].sort((a, b) => a.position - b.position);
    const result = [];
    const parents = sortedSteps.filter((s) => !s.parent_id);

    parents.forEach((parent) => {
      const parentStartDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + parent.duration);
      const parentEndDate = new Date(currentDate);

      result.push({ ...parent, computedStartDate: parentStartDate, computedEndDate: parentEndDate });

      let currentChildDate = new Date(parentStartDate);
      const children = sortedSteps.filter((s) => s.parent_id === parent.id);

      children.forEach((child) => {
        const childStart = new Date(currentChildDate);
        currentChildDate.setDate(currentChildDate.getDate() + child.duration);
        const childEnd = new Date(currentChildDate);
        result.push({ ...child, computedStartDate: childStart, computedEndDate: childEnd });
      });
    });

    return result;
  }, [steps, tripStartDate]);

  const parentSteps = stepsWithDates.filter((s) => !s.parent_id || s.parent_id === "null");
  const travelSteps = getTopLevelSteps(stepsWithDates);
  const getChildrenForParent = (parentId) => stepsWithDates.filter((s) => s.parent_id === parentId);
  const uniqueCountries = [...new Set(steps.map((s) => s.country))];
  
  const visaStats = useMemo(() => {
    const countryStays = {};
    travelSteps.forEach((step) => {
      if (!countryStays[step.country]) countryStays[step.country] = 0;
      countryStays[step.country] += Number(step.duration || 0);
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

  const activeStepInModal = steps.find((s) => s.id === selectedStep?.id);

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );

  return (
    <div className="w-full">
      <div className="mx-auto max-w-[1680px] px-4 py-6 md:px-6 xl:px-8">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)] xl:items-start">
          
          {/* ================= GAUCHE : TIMELINE ================= */}
          <div className="flex w-full flex-col gap-6 print:w-full">
            
            {/* HEADER ÉPURÉ */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white/90 dark:bg-slate-900/85 p-6 rounded-[28px] border border-slate-200/80 dark:border-slate-700 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] backdrop-blur">
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

              <div className="flex flex-wrap items-center gap-3">
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
                  <Printer size={16} /> <span className="hidden sm:inline">Export</span>
                </button>
                <button
                  onClick={() => setIsBackpackOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-all">
                  <Backpack size={16} /> <span className="hidden sm:inline">Sac</span>
                </button>
                <div className="ml-2">
                  <Auth session={session} />
                </div>
              </div>
            </div>

            {!isReadOnly && (
              <div className="print:hidden">
                <AddStepForm onAddStep={handleAddStep} parentSteps={parentSteps} />
              </div>
            )}

            {/* TIMELINE CONTAINER (BLOC STRUCTURÉ) */}
            <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] backdrop-blur dark:border-slate-700 dark:bg-slate-900/85 sm:p-6">
              
              <div className="mb-5 flex items-center justify-between">
                <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  {steps.length} Étape{steps.length > 1 ? 's' : ''} planifiée{steps.length > 1 ? 's' : ''}
                </span>
                {parentSteps.length > 0 && (
                  <button 
                    onClick={toggleAll}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1.5 transition-colors"
                  >
                    {collapsedParents.size > 0 ? <><UnfoldVertical size={14}/> Tout déplier</> : <><FoldVertical size={14}/> Tout plier</>}
                  </button>
                )}
              </div>

              {steps.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-10 text-center dark:border-slate-700 dark:bg-slate-800/50">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Aucune étape pour le moment. Ajoute ton premier camp de base ci-dessus !</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Ligne verticale de la timeline */}
                  <div className="absolute left-[21px] top-4 bottom-4 w-[2px] bg-slate-200 dark:bg-slate-700 print:hidden z-0 rounded-full"></div>

                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="ROOT" type="STEP" isDropDisabled={isReadOnly}>
                      {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                          {parentSteps.map((parentStep, index) => {
                            const excursions = getChildrenForParent(parentStep.id);
                            const isCollapsed = collapsedParents.has(parentStep.id);

                            return (
                              <Draggable key={parentStep.id} draggableId={parentStep.id} index={index} isDragDisabled={isReadOnly}>
                                {(provided, snapshot) => (
                                  <div ref={provided.innerRef} {...provided.draggableProps} className="relative pl-11 print:pl-0">
                                    
                                    {/* Point sur la timeline */}
                                    <div className={`absolute left-[15px] top-6 z-10 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900 shadow-sm print:hidden transition-colors ${isCollapsed ? 'bg-slate-400 dark:bg-slate-500' : 'bg-blue-500'}`} />

                                    <div className={`transition-all ${snapshot.isDragging ? "opacity-90 z-50 scale-[1.02]" : ""}`}>
                                      
                                      {/* CARTE CAMP DE BASE */}
                                      <div 
                                        onClick={(e) => toggleParent(parentStep.id, e)}
                                        className={`group flex flex-col sm:flex-row sm:items-center justify-between rounded-[20px] border bg-white p-4 shadow-sm transition-all cursor-pointer hover:shadow-md dark:bg-slate-800 ${snapshot.isDragging ? "border-blue-400 shadow-lg ring-2 ring-blue-100 dark:ring-blue-900/50" : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"}`}
                                      >
                                        <div className="flex items-center gap-3">
                                          {!isReadOnly && (
                                            <div {...provided.dragHandleProps} className="cursor-grab text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 p-1" onClick={(e) => e.stopPropagation()}>
                                              <GripVertical size={18} />
                                            </div>
                                          )}
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                                                {parentStep.city}
                                              </h3>
                                              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                                {parentStep.country}
                                              </span>
                                            </div>
                                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                                              <span className="flex items-center gap-1"><Calendar size={12}/> {formatDate(parentStep.computedStartDate)} - {formatDate(parentStep.computedEndDate)}</span>
                                              <span>•</span>
                                              <span className="text-blue-600 dark:text-blue-400 font-bold">{formatDaysNights(parentStep.duration, { compact: true })}</span>
                                              <LogisticsBadge step={parentStep} />
                                            </div>
                                          </div>
                                        </div>

                                        <div className="mt-3 flex items-center justify-between sm:mt-0 sm:justify-end gap-2 pl-9 sm:pl-0">
                                          {isCollapsed && excursions.length > 0 && (
                                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                                              {excursions.length} excursion{excursions.length > 1 ? 's' : ''}
                                            </span>
                                          )}
                                          
                                          <div className="flex items-center gap-1">
                                            <button 
                                              onClick={(e) => { e.stopPropagation(); setSelectedStep(parentStep); }}
                                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                              title="Voir les détails"
                                            >
                                              <Eye size={18} />
                                            </button>
                                            {!isReadOnly && (
                                              <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteStep(parentStep.id); }}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                title="Supprimer"
                                              >
                                                <Trash2 size={18} />
                                              </button>
                                            )}
                                            <div className="ml-1 text-slate-300 dark:text-slate-600">
                                              {isCollapsed ? <ChevronRight size={20}/> : <ChevronDown size={20}/>}
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* ZONE DROPPABLE POUR EXCURSIONS (Visible seulement si déplié) */}
                                      {!isCollapsed && (
                                        <Droppable droppableId={`PARENT_${parentStep.id}`} type="STEP" isDropDisabled={isReadOnly}>
                                          {(providedChild, snapshotChild) => (
                                            <div
                                              ref={providedChild.innerRef}
                                              {...providedChild.droppableProps}
                                              className={`ml-6 mt-2 space-y-2 relative before:absolute before:top-0 before:bottom-4 before:-left-[15px] before:w-[2px] before:bg-slate-200 dark:before:bg-slate-700 before:rounded-b-full transition-colors ${snapshotChild.isDraggingOver ? "bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-2 -mx-2" : "py-1"}`}
                                            >
                                              {excursions.map((excursion, childIndex) => (
                                                <Draggable key={excursion.id} draggableId={excursion.id} index={childIndex} isDragDisabled={isReadOnly}>
                                                  {(providedEx, snapEx) => (
                                                    <div
                                                      ref={providedEx.innerRef}
                                                      {...providedEx.draggableProps}
                                                      className="relative"
                                                    >
                                                      {/* Connecteur horizontal pour l'enfant */}
                                                      <div className="absolute top-1/2 -left-[15px] w-[15px] h-[2px] bg-slate-200 dark:bg-slate-700 -translate-y-1/2"></div>
                                                      
                                                      <div className={`flex items-center justify-between rounded-xl border bg-white p-3 shadow-sm transition-all dark:bg-slate-800/80 ${snapEx.isDragging ? "border-blue-400 shadow-md ring-2 ring-blue-100 z-50 scale-[1.02]" : "border-slate-100 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-500"}`}>
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                          {!isReadOnly && (
                                                            <div {...providedEx.dragHandleProps} className="cursor-grab text-slate-300 hover:text-slate-500 p-1">
                                                              <MoreVertical size={16} />
                                                            </div>
                                                          )}
                                                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                            <Map size={14} />
                                                          </div>
                                                          <div className="min-w-0 truncate">
                                                            <h4 className="truncate text-sm font-bold text-slate-800 dark:text-slate-200">
                                                              {excursion.city}
                                                            </h4>
                                                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-slate-500">
                                                              <span>{formatDaysNights(excursion.duration, { compact: true })} • {formatDate(excursion.computedStartDate)}</span>
                                                              <LogisticsBadge step={excursion} />
                                                            </div>
                                                          </div>
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-1 shrink-0 ml-2">
                                                          <button
                                                            onClick={(e) => { e.stopPropagation(); setSelectedStep(excursion); }}
                                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                                                            title="Voir les détails"
                                                          >
                                                            <Eye size={16} />
                                                          </button>
                                                          {!isReadOnly && (
                                                            <button
                                                              onClick={(e) => { e.stopPropagation(); handleDeleteStep(excursion.id); }}
                                                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                                                              title="Supprimer"
                                                            >
                                                              <Trash2 size={16} />
                                                            </button>
                                                          )}
                                                        </div>
                                                      </div>
                                                    </div>
                                                  )}
                                                </Draggable>
                                              ))}
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
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                </div>
              )}
            </div>
          </div>

          {/* ================= DROITE : MAP & SUMMARY ================= */}
          <div className="flex w-full flex-col gap-6 print:hidden xl:sticky xl:top-6">
            {steps.length > 0 && (
              <TripSummary steps={stepsWithDates} visaStats={visaStats} totalDistance={totalDistance} />
            )}

            <div className="h-80 w-full overflow-hidden rounded-[32px] border border-slate-200/80 shadow-sm dark:border-slate-700 sm:h-96 lg:h-[600px] bg-slate-200 dark:bg-slate-800">
              <RouteMap steps={stepsWithDates} />
            </div>
          </div>
        </div>
      </div>

      {selectedStep && (
        <StepModal
          step={activeStepInModal || selectedStep}
          onClose={() => setSelectedStep(null)}
          onUpdateStep={updateStep}
          isReadOnly={isReadOnly}
        />
      )}
      {isBackpackOpen && (
        <BackpackModal session={session} onClose={() => setIsBackpackOpen(false)} currentCountries={uniqueCountries} />
      )}
    </div>
  );
}