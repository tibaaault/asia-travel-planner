import { useState, useMemo } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  GripVertical,
  MapPin,
  Calendar,
  PlaneTakeoff,
  Trash2,
  Loader2,
} from "lucide-react";
import AddStepForm from "./AddStepForm";
import { useSteps } from "../hooks/useSteps";
import StepModal from "./StepModal";
import RouteMap from "./RouteMap";
import TripSummary from "./TripSummary";

export default function Timeline() {
  const { steps, loading, addStep, deleteStep, updateStepsOrder, updateStep } =
    useSteps();
  const [tripStartDate, setTripStartDate] = useState("2026-10-01");
  const [selectedStep, setSelectedStep] = useState(null);

  const handleAddStep = (newStep) => {
    addStep(newStep);
  };

  const handleDeleteStep = (idToRemove) => {
    if (window.confirm("Es-tu sûr de vouloir supprimer cette étape ?")) {
      deleteStep(idToRemove);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
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

  const formatDate = (date) => {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
    }).format(date);
  };

  const activeStepInModal = steps.find((s) => s.id === selectedStep?.id);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-blue-500">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto p-4 flex flex-col lg:flex-row gap-8 items-start">
      {/* GAUCHE : LA CARTE INTERACTIVE (Prend moins de place) */}
      <div className="w-full lg:w-1/2 xl:w-[55%]">
        <RouteMap steps={stepsWithDates} />
      </div>

      {/* DROITE : LA TIMELINE (S'élargit) */}
      <div className="w-full lg:w-1/2 xl:w-[45%] shrink-0">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <MapPin className="text-blue-500" /> Itinéraire
          </h2>

          <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
            <PlaneTakeoff size={18} className="text-gray-500" />
            <input
              type="date"
              value={tripStartDate}
              onChange={(e) => setTripStartDate(e.target.value)}
              className="text-sm font-medium text-gray-700 focus:outline-none"
            />
          </div>
        </div>
        {steps.length > 0 && <TripSummary steps={steps} />}

        <AddStepForm onAddStep={handleAddStep} />

        {steps.length === 0 ? (
          <p className="text-center text-gray-500 my-8">
            Aucune étape pour le moment. Commence ton voyage !
          </p>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="timeline">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-3">
                  {/* C'est ce bloc qui avait disparu ! 👇 */}
                  {stepsWithDates.map((step, index) => (
                    <Draggable
                      key={step.id}
                      draggableId={step.id}
                      index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          onClick={() => setSelectedStep(step)}
                          className={`p-4 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center gap-4 transition-all hover:border-blue-300 cursor-pointer ${
                            snapshot.isDragging
                              ? "shadow-lg border-blue-400 rotate-1"
                              : ""
                          }`}>
                          <div
                            {...provided.dragHandleProps}
                            className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing">
                            <GripVertical size={20} />
                          </div>

                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-800 text-lg">
                              {step.city}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {step.country}
                            </p>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right flex flex-col items-end">
                              <div className="flex items-center gap-1 text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                <Calendar size={14} />
                                {formatDate(step.computedStartDate)} -{" "}
                                {formatDate(step.computedEndDate)}
                              </div>
                              <span className="text-xs font-medium text-blue-500 mt-1">
                                {step.duration} jours
                              </span>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteStep(step.id);
                              }}
                              className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors cursor-pointer"
                              title="Supprimer cette étape">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {/* Fin du bloc restauré 👆 */}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {/* Modale */}
      {selectedStep && (
        <StepModal
          step={activeStepInModal || selectedStep}
          onClose={() => setSelectedStep(null)}
          onUpdateStep={updateStep}
        />
      )}
    </div>
  );
}
