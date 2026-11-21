import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

// Choix d'un créneau avec deux listes simples : le jour, puis l'heure. Heure de Lomé = UTC.
export default function SlotPicker({ slots, value, onChange }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage?.startsWith('en') ? 'en-GB' : 'fr-FR';
  const formats = useMemo(() => ({
    day: new Intl.DateTimeFormat(locale, { timeZone: 'Africa/Lome', weekday: 'long', day: 'numeric', month: 'long' }),
    time: new Intl.DateTimeFormat(locale, { timeZone: 'Africa/Lome', hour: '2-digit', minute: '2-digit' }),
  }), [locale]);
  const days = useMemo(() => [...new Set(slots.map((slot) => slot.slice(0, 10)))], [slots]);
  const [day, setDay] = useState(() => value?.slice(0, 10) || days[0] || '');
  const currentDay = days.includes(day) ? day : days[0];
  const daySlots = slots.filter((slot) => slot.startsWith(currentDay));

  return (
    <div className="slot-selects">
      <label>{t('slots.day')}
        <select value={currentDay} onChange={(event) => { setDay(event.target.value); onChange(''); }}>
          {days.map((item) => (
            <option key={item} value={item}>
              {formats.day.format(new Date(`${item}T12:00:00Z`))}
            </option>
          ))}
        </select>
      </label>
      <label>{t('slots.hour')}
        <select value={value && value.startsWith(currentDay) ? value : ''} onChange={(event) => onChange(event.target.value)}>
          <option value="" disabled>{t('slots.chooseHour')}</option>
          {daySlots.map((slot) => <option key={slot} value={slot}>{formats.time.format(new Date(slot))}</option>)}
        </select>
      </label>
    </div>
  );
}
