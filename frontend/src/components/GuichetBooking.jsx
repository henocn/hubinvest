import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { publicErrorMessage } from '../lib/public-error';
import { isValidPhone, toInternationalPhone } from '../lib/phone';
import PhoneField from './PhoneField';
import SlotPicker from './SlotPicker';
import StepSummary from './StepSummary';

// « Prendre rendez-vous » à un guichet : le créneau (jour, heure), puis les coordonnées. Le créneau choisi reste
// résumé en une ligne avec « Modifier ». La personne reçoit la confirmation par e-mail,
// puis un rappel la veille et une heure avant.
export default function GuichetBooking({ guichet }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage?.startsWith('en') ? 'en-GB' : 'fr-FR';
  const full = useMemo(() => new Intl.DateTimeFormat(locale, { timeZone: 'Africa/Lome', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }), [locale]);
  const [slots, setSlots] = useState(null);
  const [pending, setPending] = useState('');
  const [chosen, setChosen] = useState('');
  const [form, setForm] = useState({ fullName: '', email: '', phone: '' });
  const [phoneChecked, setPhoneChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [booked, setBooked] = useState(null);
  const stepRef = useRef(null);

  const loadSlots = () => api.guichetSlots(guichet).then(setSlots);

  useEffect(() => {
    let active = true;
    api.guichetSlots(guichet)
      .then((data) => { if (active) setSlots(data); })
      .catch((requestError) => { if (active) setError(publicErrorMessage(t, requestError)); });
    return () => { active = false; };
  }, [guichet, t]);

  // Le début de l'étape suivante revient sous les yeux.
  useEffect(() => {
    if (chosen) stepRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [chosen]);

  const field = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setPhoneChecked(true);
    if (!chosen || !isValidPhone(form.phone)) return;
    setSaving(true);
    setError('');
    try {
      setBooked(await api.bookGuichet({ ...form, phone: toInternationalPhone(form.phone), guichet, startsAt: chosen, consentApizf: true }));
    } catch (requestError) {
      setError(publicErrorMessage(t, requestError));
      if (requestError.code === 'GUICHET_SLOT_TAKEN' || requestError.code === 'GUICHET_SLOT_INVALID') {
        setChosen('');
        setPending('');
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
          <p>{t('guichets.bookedText', { when: full.format(new Date(booked.startsAt)), place: booked.location })}</p>
        </div>
      </div>
    );
  }

  if (!chosen) {
    return (
      <section className="booking-step" aria-labelledby="slot-step-title">
        <header className="booking-step-head">
          <h2 id="slot-step-title">{t('guichets.chooseSlot')}</h2>
          {slots && <p>{t('guichets.slotHint', { minutes: slots.minutes })}</p>}
        </header>
        {error && <p className="request-error" role="alert">{error}</p>}
        {!slots && !error && <p className="public-message">{t('common.loading')}</p>}
        {slots && !slots.slots.length && <p className="public-message">{t('guichets.noSlot')}</p>}
        {slots && slots.slots.length > 0 && (
          <>
            <SlotPicker slots={slots.slots} value={pending} onChange={setPending} />
            <button className="button button-primary booking-submit" type="button" disabled={!pending} onClick={() => setChosen(pending)}>{t('common.continue')}</button>
          </>
        )}
      </section>
    );
  }

  return (
    <div className="booking-step" ref={stepRef}>
      <StepSummary label={t('guichets.slot')} value={full.format(new Date(chosen))} onEdit={() => { setChosen(''); setError(''); }} />
      <form className="investor-request-form booking-step" onSubmit={submit}>
        <header className="booking-step-head"><h2>{t('investor.details')}</h2></header>
        <div className="investor-step">
          <label>{t('fields.fullName')}<input value={form.fullName} onChange={(event) => field('fullName', event.target.value)} minLength={2} maxLength={160} autoComplete="name" required /></label>
          <div className="public-field-row">
            <label>{t('fields.email')}<input type="email" value={form.email} onChange={(event) => field('email', event.target.value)} maxLength={180} autoComplete="email" required /></label>
            <PhoneField value={form.phone} onChange={(phone) => field('phone', phone)} showError={phoneChecked} />
          </div>
          {error && <p className="request-error" role="alert">{error}</p>}
          <button className="button button-primary booking-submit" type="submit" disabled={saving}>{saving ? t('common.sending') : t('guichets.confirm')}</button>
        </div>
      </form>
    </div>
  );
}
