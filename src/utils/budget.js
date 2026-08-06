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

export const getStepEstimatedTotal = (step) =>
  toNumber(step?.budget_estimated) +
  (step?.activities || []).reduce(
    (acc, activity) => acc + getActivityEstimatedPrice(activity),
    0,
  );

export const getStepPaidTotal = (step) =>
  toNumber(step?.budget_spent) +
  (step?.activities || []).reduce(
    (acc, activity) => acc + getActivityPaidPrice(activity),
    0,
  );

export const getTripEstimatedTotal = (steps) =>
  steps.reduce((acc, step) => acc + getStepEstimatedTotal(step), 0);

export const getTripPaidTotal = (steps) =>
  steps.reduce((acc, step) => acc + getStepPaidTotal(step), 0);

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
