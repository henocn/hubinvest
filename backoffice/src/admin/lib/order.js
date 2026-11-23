// Ordre des listes datées (rendez-vous, relances) : ce qui reste à venir ou à faire d'abord, puis le reste ; dans chaque
// groupe, du plus proche de maintenant au plus lointain.
export const upcomingFirst = (items, dateOf, isOpen) => {
  const now = Date.now();
  const time = (item) => new Date(dateOf(item)).getTime();
  const open = items.filter(isOpen).sort((a, b) => time(a) - time(b));
  const closed = items.filter((item) => !isOpen(item)).sort((a, b) => Math.abs(time(a) - now) - Math.abs(time(b) - now));
  return [...open, ...closed];
};
