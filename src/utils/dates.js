// Dates calculées des étapes : on part de la date de départ du voyage et on
// avance de `duration` nuits par étape mère ; les excursions sont datées à
// partir du début de leur étape mère.
export const computeStepDates = (steps, tripStartDate) => {
  const currentDate = new Date(tripStartDate);
  const sortedSteps = [...steps].sort((a, b) => a.position - b.position);
  const result = [];
  const parents = sortedSteps.filter((s) => !s.parent_id);

  parents.forEach((parent) => {
    const parentStartDate = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() + parent.duration);
    const parentEndDate = new Date(currentDate);

    result.push({
      ...parent,
      computedStartDate: parentStartDate,
      computedEndDate: parentEndDate,
    });

    const currentChildDate = new Date(parentStartDate);
    sortedSteps
      .filter((s) => s.parent_id === parent.id)
      .forEach((child) => {
        const childStart = new Date(currentChildDate);
        currentChildDate.setDate(currentChildDate.getDate() + child.duration);
        const childEnd = new Date(currentChildDate);
        result.push({
          ...child,
          computedStartDate: childStart,
          computedEndDate: childEnd,
        });
      });
  });

  return result;
};

// Numéro de jour calendaire local, pour comparer deux dates sans l'heure.
const toDayNumber = (date) =>
  Math.floor(
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() /
      86400000,
  );

const containsDay = (step, day) =>
  toDayNumber(step.computedStartDate) <= day &&
  day < toDayNumber(step.computedEndDate);

// Où en est le voyage aujourd'hui. Le jour d'un changement d'étape, c'est
// l'étape qui commence qui est "en cours" (on y dort le soir même).
export const getTripProgress = (stepsWithDates, now = new Date()) => {
  const parents = stepsWithDates.filter((s) => !s.parent_id);
  if (parents.length === 0) return { status: "empty" };

  const today = toDayNumber(now);
  const firstDay = toDayNumber(parents[0].computedStartDate);
  const lastDay = toDayNumber(parents[parents.length - 1].computedEndDate);

  if (today < firstDay) {
    return { status: "before", daysUntilStart: firstDay - today };
  }
  // Le dernier jour (départ) fait encore partie du voyage.
  if (today > lastDay) return { status: "after" };

  const index = Math.max(
    0,
    parents.findIndex((step) => containsDay(step, today)),
  );
  const isLastDay = today === lastDay;
  const currentIndex = isLastDay ? parents.length - 1 : index;
  const current = parents[currentIndex];
  const excursion =
    stepsWithDates.find(
      (s) => s.parent_id === current.id && containsDay(s, today),
    ) || null;

  return {
    status: "ongoing",
    current,
    excursion,
    next: parents[currentIndex + 1] || null,
    // Jour 1 = jour d'arrivée dans l'étape.
    dayInStep: today - toDayNumber(current.computedStartDate) + 1,
    nightsLeft: Math.max(toDayNumber(current.computedEndDate) - today, 0),
    tripDay: today - firstDay + 1,
    tripTotalDays: lastDay - firstDay + 1,
  };
};

export const formatShortDate = (date) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
    date,
  );
