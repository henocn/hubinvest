// Échéances (relances, réponses promises) : en retard, aujourd'hui ou plus tard. Lomé est à l'heure UTC.
const time = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', hour: '2-digit', minute: '2-digit' });
const dateTime = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const day = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', day: 'numeric', month: 'short' });

const dayStart = (offset = 0) => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offset);
  return date;
};

// « late » : heure dépassée ; « today » : à faire avant la fin de la journée ; null : plus tard ou sans date.
export const dueState = (at) => {
  if (!at) return null;
  const date = new Date(at);
  if (date < new Date()) return 'late';
  return date < dayStart(1) ? 'today' : null;
};

// « Aujourd'hui, 19:28 », « Demain, 10:00 », sinon la date ; sans heure quand seule la date compte.
export const dueLabel = (at, { withTime = true } = {}) => {
  const date = new Date(at);
  const hour = withTime ? `, ${time.format(date)}` : '';
  if (date >= dayStart(0) && date < dayStart(1)) return `Aujourd’hui${hour}`;
  if (date >= dayStart(1) && date < dayStart(2)) return `Demain${hour}`;
  if (date >= dayStart(-1) && date < dayStart(0)) return `Hier${hour}`;
  return withTime ? dateTime.format(date) : day.format(date);
};
