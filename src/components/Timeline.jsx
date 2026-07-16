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
  Navigation,
  Moon,
  Sun,
} from "lucide-react";
import AddStepForm from "./AddStepForm";
import { useSteps } from "../hooks/useSteps";
import StepModal from "./StepModal";
import RouteMap from "./RouteMap";
import TripSummary from "./TripSummary";
import { supabase } from "../config/supabaseClient";
import Auth from "./Auth";
import BackpackModal from "./BackpackModal";

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

export default function Timeline() {
  const { steps, loading, addStep, deleteStep, updateStepsOrder, updateStep } =
    useSteps();
  const [tripStartDate, setTripStartDate] = useState("2026-10-01");
  const [selectedStep, setSelectedStep] = useState(null);
  const [session, setSession] = useState(null);
  const [isBackpackOpen, setIsBackpackOpen] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(false);
  const toggleDarkMode = () => {
    document.documentElement.classList.toggle("dark");
    setIsDarkMode(!isDarkMode);
  };

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => setSession(session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) =>
      setSession(session),
    );

    return () => subscription.unsubscribe();
  }, []);

  // --- NOUVEAU : Fonction pour basculer le thème ---
  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDarkMode(true);
    }
  };

  const isReadOnly = !session;
  const handleAddStep = (newStep) => addStep(newStep);
  const handleDeleteStep = (idToRemove) => {
    if (window.confirm("Supprimer cette étape ?")) deleteStep(idToRemove);
  };

  const handleDragEnd = (result) => {
    if (!result.destination || isReadOnly) return;
    const items = Array.from(steps);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    updateStepsOrder(items);
  };

  const stepsWithDates = useMemo(() => {
    let currentDate = new Date(tripStartDate);
    return steps.map((step) => {
      const startDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + step.duration);
      const endDate = new Date(currentDate);
      return {
        ...step,
        computedStartDate: startDate,
        computedEndDate: endDate,
      };
    });
  }, [steps, tripStartDate]);

  const formatDate = (date) =>
    new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
      date,
    );
  const activeStepInModal = steps.find((s) => s.id === selectedStep?.id);

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );

  return (
    // Ajout de dark:bg-slate-900 pour le fond global
    <div className="bg-slate-50 dark:bg-slate-900 transition-colors duration-300 min-h-screen font-sans">
      <div className="max-w-[1600px] mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8 items-start">
        {/* ================= GAUCHE : TIMELINE ================= */}
        <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col gap-6 shrink-0 print:w-full">
          {/* En-tête Global avec dark mode support */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors print:border-none print:shadow-none print:p-0">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3 transition-colors">
                  <MapPin className="text-blue-500" size={32} /> Mon Itinéraire
                </h1>
                {isReadOnly && (
                  <div className="inline-flex items-center gap-1.5 mt-2 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider print:hidden">
                    <Eye size={14} /> Visiteur
                  </div>
                )}
              </div>
              <div className="print:hidden flex items-center gap-2">
                <button
                  onClick={toggleDarkMode}
                  className="p-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                  title="Basculer le thème">
                  {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <Auth session={session} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-700 transition-colors print:hidden">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                <PlaneTakeoff
                  size={18}
                  className="text-slate-500 dark:text-slate-400"
                />
                <input
                  type="date"
                  value={tripStartDate}
                  onChange={(e) => setTripStartDate(e.target.value)}
                  disabled={isReadOnly}
                  className="text-sm font-semibold text-slate-700 dark:text-slate-300 focus:outline-none bg-transparent"
                />
              </div>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-slate-800 dark:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors shadow-sm">
                <Printer size={16} /> PDF
              </button>
              <button
                onClick={() => setIsBackpackOpen(true)}
                className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-colors shadow-sm">
                <Backpack size={16} /> Sac à dos
              </button>
            </div>
          </div>

          {!isReadOnly && (
            <div className="print:hidden">
              <AddStepForm onAddStep={handleAddStep} />
            </div>
          )}

          {/* LA TIMELINE VERTICALE */}
          <div className="relative bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors print:border-none print:shadow-none print:p-0">
            {steps.length === 0 ? (
              <p className="text-center text-slate-400 dark:text-slate-500 italic">
                Aucune étape pour le moment.
              </p>
            ) : (
              <div className="relative">
                <div className="absolute left-6 top-4 bottom-4 w-0.5 border-l-2 border-dashed border-slate-200 dark:border-slate-600 print:hidden z-0"></div>

                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="timeline" isDropDisabled={isReadOnly}>
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-6 max-h-[65vh] overflow-y-auto pr-2 pb-10 pt-2 scroll-smooth print:max-h-none print:overflow-visible">
                        {stepsWithDates.map((step, index) => {
                          const prevStep =
                            index > 0 ? stepsWithDates[index - 1] : null;
                          const distance =
                            prevStep && prevStep.lat && step.lat
                              ? calculateDistance(
                                  prevStep.lat,
                                  prevStep.lng,
                                  step.lat,
                                  step.lng,
                                )
                              : null;

                          return (
                            <Draggable
                              key={step.id}
                              draggableId={step.id}
                              index={index}
                              isDragDisabled={isReadOnly}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className="relative pl-12 print:pl-0 print:mb-4">
                                  <div className="absolute left-[1.10rem] top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full ring-4 ring-white dark:ring-slate-800 shadow-sm z-10 print:hidden"></div>

                                  {distance && (
                                    <div className="absolute left-[-2rem] top-[-1.5rem] flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-300 bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-600 shadow-sm z-10 print:hidden">
                                      <Navigation
                                        size={10}
                                        className="text-blue-400"
                                      />{" "}
                                      {distance} km
                                    </div>
                                  )}

                                  <div
                                    onClick={() => setSelectedStep(step)}
                                    className={`p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4 transition-all hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md cursor-pointer print:border-b print:border-slate-200 print:shadow-none print:rounded-none ${
                                      snapshot.isDragging
                                        ? "shadow-xl border-blue-400 rotate-2 scale-105 z-50"
                                        : ""
                                    }`}>
                                    {!isReadOnly && (
                                      <div
                                        {...provided.dragHandleProps}
                                        className="text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 cursor-grab active:cursor-grabbing print:hidden">
                                        <GripVertical size={20} />
                                      </div>
                                    )}

                                    <div className="flex-1">
                                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight">
                                        {step.city}
                                      </h3>
                                      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                                        {step.country}
                                      </p>
                                    </div>

                                    <div className="flex items-center gap-4">
                                      <div className="text-right flex flex-col items-end">
                                        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-100 dark:border-slate-700">
                                          <Calendar
                                            size={14}
                                            className="text-blue-500"
                                          />
                                          {formatDate(step.computedStartDate)} -{" "}
                                          {formatDate(step.computedEndDate)}
                                        </div>
                                        <span className="text-xs font-bold text-blue-500 dark:text-blue-400 mt-1.5 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">
                                          {step.duration} jours
                                        </span>
                                      </div>

                                      {!isReadOnly && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteStep(step.id);
                                          }}
                                          className="text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-full transition-colors cursor-pointer print:hidden"
                                          title="Supprimer">
                                          <Trash2 size={18} />
                                        </button>
                                      )}
                                    </div>
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
        <div className="w-full lg:w-[55%] xl:w-[60%] flex flex-col gap-6 sticky top-8 print:hidden">
          {steps.length > 0 && <TripSummary steps={steps} />}

          <div className="h-[400px] lg:h-[700px] w-full rounded-3xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700">
            <RouteMap steps={stepsWithDates} />
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
        <BackpackModal onClose={() => setIsBackpackOpen(false)} />
      )}
    </div>
  );
}
