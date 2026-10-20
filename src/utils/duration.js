// `duration` d'une étape = nombre de nuits sur place : c'est ce qui fait
// avancer les dates (du 10 au 11 = 1 nuit). Les jours comptent l'arrivée
// et le départ, soit une nuit de plus.
export const getDaysFromNights = (nights) => (Number(nights) || 0) + 1;

export const formatDaysNights = (nights, { compact = false } = {}) => {
  const totalNights = Number(nights) || 0;
  const totalDays = getDaysFromNights(totalNights);

  if (compact) {
    return `${totalDays} j / ${totalNights} n`;
  }

  const dayLabel = totalDays > 1 ? "jours" : "jour";
  const nightLabel = totalNights > 1 ? "nuits" : "nuit";

  return `${totalDays} ${dayLabel} / ${totalNights} ${nightLabel}`;
};
