export const getNightsFromDays = (days) => {
  const totalDays = Number(days) || 0;
  return Math.max(totalDays - 1, 0);
};

export const formatDaysNights = (days, { compact = false } = {}) => {
  const totalDays = Number(days) || 0;
  const totalNights = getNightsFromDays(totalDays);

  if (compact) {
    return `${totalDays} j / ${totalNights} n`;
  }

  const dayLabel = totalDays > 1 ? "jours" : "jour";
  const nightLabel = totalNights > 1 ? "nuits" : "nuit";

  return `${totalDays} ${dayLabel} / ${totalNights} ${nightLabel}`;
};
