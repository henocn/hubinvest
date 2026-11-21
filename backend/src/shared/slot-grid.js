// Grille de créneaux jour par jour (heure de Lomé = UTC), utilisée par le Studio et les guichets.
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

const toMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Début (en millisecondes) de chaque créneau entre le premier et le dernier jour, de l'heure d'ouverture à la fermeture.
const slotGrid = ({ firstDay, lastDay, dayStart, dayEnd, minutes }) => {
  const slots = [];
  for (let day = Date.parse(`${firstDay}T00:00:00Z`); day <= Date.parse(`${lastDay}T00:00:00Z`); day += DAY) {
    const last = day + toMinutes(dayEnd) * MINUTE;
    for (let start = day + toMinutes(dayStart) * MINUTE; start + minutes * MINUTE <= last; start += minutes * MINUTE) slots.push(start);
  }
  return slots;
};

module.exports = { MINUTE, DAY, slotGrid };
