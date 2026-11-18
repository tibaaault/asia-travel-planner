const toNumber = (value) => Number(value) || 0;

export const getTopLevelSteps = (steps) =>
  [...steps].filter(
    (step) =>
      step.parent_id === null ||
      step.parent_id === undefined ||
      step.parent_id === "" ||
      step.parent_id === "null",
  );

export const getActivityEstimatedPrice = (activity) =>
  toNumber(activity?.estimatedPrice ?? activity?.price ?? 0);

export const getActivityPaidPrice = (activity) =>
  toNumber(activity?.price ?? 0);

// Part payée par quelqu'un d'autre (parents, ami...). Elle compte dans le
// coût total du voyage, pas dans ce que j'ai payé : "payé" reste ma part.
export const getActivityOthersPrice = (activity) =>
  toNumber(activity?.paidByOthers ?? 0);

export const getStepEstimatedTotal = (step) =>
  toNumber(step?.budget_estimated) +
  toNumber(step?.lodging_price_estimated) +
  toNumber(step?.transport_price_estimated) +
  (step?.activities || []).reduce(
    (acc, activity) => acc + getActivityEstimatedPrice(activity),
    0,
  );

export const getStepPaidTotal = (step) =>
  toNumber(step?.budget_spent) +
  toNumber(step?.lodging_price_paid) +
  toNumber(step?.transport_price_paid) +
  (step?.activities || []).reduce(
    (acc, activity) => acc + getActivityPaidPrice(activity),
    0,
  );

export const getStepOthersTotal = (step) =>
  toNumber(step?.budget_others) +
  toNumber(step?.lodging_price_others) +
  toNumber(step?.transport_price_others) +
  (step?.activities || []).reduce(
    (acc, activity) => acc + getActivityOthersPrice(activity),
    0,
  );

export const getTripEstimatedTotal = (steps) =>
  steps.reduce((acc, step) => acc + getStepEstimatedTotal(step), 0);

export const getTripPaidTotal = (steps) =>
  steps.reduce((acc, step) => acc + getStepPaidTotal(step), 0);

export const getTripOthersTotal = (steps) =>
  steps.reduce((acc, step) => acc + getStepOthersTotal(step), 0);

export const getParentStepBudgetBreakdown = (steps) => {
  const sortedSteps = [...steps].sort((a, b) => a.position - b.position);
  const parents = getTopLevelSteps(sortedSteps);

  const getDescendantSteps = (parentId) => {
    const directChildren = sortedSteps.filter(
      (step) => step.parent_id === parentId,
    );
    return directChildren.flatMap((child) => [
      child,
      ...getDescendantSteps(child.id),
    ]);
  };

  return parents.map((parent) => {
    const branchSteps = [parent, ...getDescendantSteps(parent.id)];
    return {
      parent,
      estimatedTotal: branchSteps.reduce(
        (acc, step) => acc + getStepEstimatedTotal(step),
        0,
      ),
      paidChildrenTotal: branchSteps.reduce(
        (acc, step) => acc + getStepPaidTotal(step),
        0,
      ),
      childrenCount: branchSteps.length - 1,
    };
  });
};

// Voyages (ex. "Indonésie", "Vietnam partie 1") : une étape mère qui porte
// un `trip_segment` ouvre un voyage, les étapes mères suivantes en font
// partie jusqu'au prochain nom. Renvoie la liste ordonnée des voyages avec
// les ids de leurs étapes mères.
export const DEFAULT_SEGMENT_LABEL = "Voyage";

export const getTripSegments = (steps) => {
  const sortedSteps = [...steps].sort((a, b) => a.position - b.position);
  const segments = [];

  getTopLevelSteps(sortedSteps).forEach((step) => {
    const label = (step.trip_segment || "").trim();
    if (label || segments.length === 0) {
      segments.push({
        id: `segment-${step.id}`,
        label: label || DEFAULT_SEGMENT_LABEL,
        stepIds: [],
      });
    }
    segments[segments.length - 1].stepIds.push(step.id);
  });

  return segments;
};
