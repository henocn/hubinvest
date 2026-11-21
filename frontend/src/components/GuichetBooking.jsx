import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { publicErrorMessage } from '../lib/public-error';
import { isValidPhone, toInternationalPhone } from '../lib/phone';
import PhoneField from './PhoneField';

// « Prendre rendez-vous » à un guichet : un jour, un créneau libre, puis les coordonnées. La personne reçoit
// la confirmation par e-mail, puis un rappel la veille et une heure avant.
export default function GuichetBooking({ guichet }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage?.startsWith('en') ? 'en-GB' : 'fr-FR';
  const formats = useMemo(() => ({
    shortDay: new Intl.DateTimeFormat(locale, { timeZone: 'Africa/Lome', weekday: 'short', day: 'numeric', month: 'short' }),
    time: new Intl.DateTimeFormat(locale, { timeZone: 'Africa/Lome', hour: '2-digit', minute: '2-digit' }),
    full: new Intl.DateTimeFormat(locale, { timeZone: 'Africa/Lome', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }),
  }), [locale]);
  const [slots, setSlots] = useState(null);
  const [day, setDay] = useState('');
  const [chosen, setChosen] = useState('');
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', organization: '', projectSummary: '', consentApizf: false });
  const [phoneChecked, setPhoneChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [booked, setBooked] = useState(null);

  const loadSlots = async () => {
    const data = await api.guichetSlots(guichet);
    setSlots(data);
    setDay((current) => (data.slots.some((slot) => slot.startsWith(current)) ? current : data.slots[0]?.slice(0, 10) || ''));
  };

  useEffect(() => {
    let active = true;
    setSlots(null);
    setChosen('');
    setError('');
    api.guichetSlots(guichet)
      .then((data) => {
        if (!active) return;
        setSlots(data);
        setDay(data.slots[0]?.slice(0, 10) || '');
      })
      .catch((requestError) => { if (active) setError(publicErrorMessage(t, requestError)); });
    return () => { active = false; };
  }, [guichet, t]);

  const field = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setPhoneChecked(true);
    if (!chosen || !isValidPhone(form.phone)) return;
    setSaving(true);
    setError('');
    try {
      setBooked(await api.bookGuichet({ ...form, phone: toInternationalPhone(form.phone), guichet, startsAt: chosen }));
    } catch (requestError) {
      setError(publicErrorMessage(t, requestError));
      if (requestError.code === 'GUICHET_SLOT_TAKEN') {
        setChosen('');
        await loadSlots().catch(() => {});
      }
    } finally {
      setSaving(false);
    }
  };

  if (booked) {
    return (
      <div className="investor-request-success" role="status">
        <span><CalendarCheck size={23} /></span>
        <div>
          <h2>{t('guichets.bookedTitle')}</h2>
          <p>{t('guichets.bookedText', { when: formats.full.format(new Date(booked.startsAt)), place: booked.location })}</p>
        </div>
      </div>
    );
  }

  const days = slots ? [...new Set(slots.slots.map((slot) => slot.slice(0, 10)))] : [];
  const daySlots = slots ? slots.slots.filter((slot) => slot.startsWith(day)) : [];

  return (
    <form className="investor-request-form guichet-booking" onSubmit={submit}>
      {!slots && !error && <p className="public-message">{t('common.loading')}</p>}
      {slots && (
        <section className="investor-step" aria-label={t('guichets.chooseSlot')}>
          <header><h2>{t('guichets.chooseSlot')}</h2><p>{t('guichets.slotHint', { minutes: slots.minutes })}</p></header>
          {!slots.slots.length ? <p className="public-message">{t('guichets.noSlot')}</p> : (
            <>
              <div className="studio-days" role="tablist">
                {days.map((item) => (
                  <button key={item} type="button" role="tab" aria-selected={item === day} className={item === day ? 'is-selected' : ''} onClick={() => { setDay(item); setChosen(''); }}>
                    {formats.shortDay.format(new Date(`${item}T12:00:00Z`))}
                  </button>
                ))}
              </div>
              <div className="studio-slots">
                {daySlots.map((slot) => (
                  <button key={slot} type="button" aria-pressed={slot === chosen} className={slot === chosen ? 'is-selected' : ''} onClick={() => setChosen(slot)}>
                    {formats.time.format(new Date(slot))}
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {chosen && (
        <section className="investor-step">
          <header><h2>{t('investor.details')}</h2></header>
          <label>{t('fields.fullName')}<input value={form.fullName} onChange={(event) => field('fullName', event.target.value)} minLength={2} maxLength={160} autoComplete="name" required /></label>
          <div className="public-field-row">
            <label>{t('fields.email')}<input type="email" value={form.email} onChange={(event) => field('email', event.target.value)} maxLength={180} autoComplete="email" required /></label>
            <PhoneField value={form.phone} onChange={(phone) => field('phone', phone)} showError={phoneChecked} />
          </div>
          <label>{t('guichets.organization')} <small>({t('common.optional')})</small><input value={form.organization} onChange={(event) => field('organization', event.target.value)} maxLength={160} autoComplete="organization" /></label>
          <label>{t('guichets.subject')}<textarea value={form.projectSummary} onChange={(event) => field('projectSummary', event.target.value)} rows={4} minLength={10} maxLength={6000} required /></label>
          <label className="request-consent investor-consent">
            <input type="checkbox" checked={form.consentApizf} onChange={(event) => field('consentApizf', event.target.checked)} required />
            <span>{t('investor.consent')}</span>
          </label>
          <div className="investor-form-actions">
            <button className="button button-primary" type="submit" disabled={saving}>{saving ? t('common.sending') : t('guichets.book', { time: formats.full.format(new Date(chosen)) })}</button>
          </div>
        </section>
      )}
      {error && <p className="request-error" role="alert">{error}</p>}
    </form>
  );
}
