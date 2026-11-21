import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, PlayCircle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { publicErrorMessage } from '../lib/public-error';

// Page personnelle d'un invité du Studio (lien reçu par e-mail) : il choisit lui-même son créneau parmi ceux
// encore libres, peut en changer jusqu'à une heure avant ou décliner, puis retrouve ici sa capsule une fois livrée.
export default function StudioInvitationPage({ token }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage?.startsWith('en') ? 'en-GB' : 'fr-FR';
  const [invitation, setInvitation] = useState(null);
  const [slots, setSlots] = useState(null);
  const [day, setDay] = useState('');
  const [chosen, setChosen] = useState('');
  const [choosing, setChoosing] = useState(false);
  const [confirmDecline, setConfirmDecline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const formats = useMemo(() => ({
    day: new Intl.DateTimeFormat(locale, { timeZone: 'Africa/Lome', weekday: 'long', day: 'numeric', month: 'long' }),
    shortDay: new Intl.DateTimeFormat(locale, { timeZone: 'Africa/Lome', weekday: 'short', day: 'numeric', month: 'short' }),
    time: new Intl.DateTimeFormat(locale, { timeZone: 'Africa/Lome', hour: '2-digit', minute: '2-digit' }),
  }), [locale]);

  const loadSlots = useCallback(async () => {
    const data = await api.studioSlots(token);
    setSlots(data);
    const firstDay = data.slots[0]?.slice(0, 10) || '';
    setDay((current) => (data.slots.some((slot) => slot.startsWith(current)) ? current : firstDay));
  }, [token]);

  useEffect(() => {
    let active = true;
    api.publicStudioInvitation(token)
      .then(async (data) => {
        if (!active) return;
        setInvitation(data);
        if (data.status === 'invited') await loadSlots();
      })
      .catch((requestError) => { if (active) setError(publicErrorMessage(t, requestError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadSlots, t, token]);

  const startChange = async () => {
    setError('');
    setChosen('');
    setChoosing(true);
    try {
      await loadSlots();
    } catch (requestError) {
      setError(publicErrorMessage(t, requestError));
    }
  };

  const book = async () => {
    if (!chosen) return;
    setSaving(true);
    setError('');
    try {
      setInvitation(await api.bookStudio(token, chosen));
      setChoosing(false);
      setChosen('');
    } catch (requestError) {
      setError(publicErrorMessage(t, requestError));
      if (requestError.code === 'STUDIO_SLOT_TAKEN') await loadSlots();
    } finally {
      setSaving(false);
    }
  };

  const decline = async () => {
    setSaving(true);
    setError('');
    try {
      setInvitation(await api.declineStudio(token));
      setConfirmDecline(false);
    } catch (requestError) {
      setError(publicErrorMessage(t, requestError));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <main className="public-container studio-response-page"><p className="public-message">{t('studio.loading')}</p></main>;
  if (!invitation) return <main className="public-container studio-response-page"><p className="public-message is-error">{error || t('studio.notFound')}</p></main>;

  const { status } = invitation;
  const showSlots = status === 'invited' || (status === 'booked' && choosing);
  const days = slots ? [...new Set(slots.slots.map((slot) => slot.slice(0, 10)))] : [];
  const daySlots = slots ? slots.slots.filter((slot) => slot.startsWith(day)) : [];

  return (
    <main className="public-container studio-response-page">
      <section className="studio-response-panel">
        <span className="studio-eyebrow">{t('studio.eyebrow')}</span>
        <h1>{t('studio.invitation', { name: invitation.guestName })}</h1>
        <p className="studio-subject">{t('studio.format', { format: t(`studio.formats.${invitation.format}`) })}{invitation.subject ? ` · ${invitation.subject}` : ''}</p>

        {status === 'booked' && !choosing && (
          <>
            <div className="studio-schedule">
              <span><CalendarDays size={20} /><strong>{formats.day.format(new Date(invitation.scheduledAt))}</strong></span>
              <span><Clock3 size={20} /><strong>{formats.time.format(new Date(invitation.scheduledAt))}</strong></span>
            </div>
            <div className="studio-response-status is-confirmed"><CheckCircle2 size={24} /><div><strong>{t('studio.booked')}</strong><span>{t('studio.bookedHint')}</span></div></div>
          </>
        )}

        {status === 'delivered' && (
          <div className="studio-response-status is-confirmed"><PlayCircle size={24} /><div><strong>{t('studio.delivered')}</strong><span>{t('studio.deliveredHint')}</span></div></div>
        )}
        {status === 'declined' && <div className="studio-response-status is-declined"><XCircle size={24} /><div><strong>{t('studio.declined')}</strong><span>{t('studio.declinedHint')}</span></div></div>}
        {status === 'cancelled' && <div className="studio-response-status is-declined"><XCircle size={24} /><div><strong>{t('studio.cancelled')}</strong><span>{t('studio.cancelledHint')}</span></div></div>}

        {showSlots && slots && (
          <section className="studio-booking" aria-label={t('studio.choose')}>
            <h2>{t('studio.choose')}</h2>
            <p className="studio-subject">{t('studio.chooseHint', { minutes: slots.minutes })}</p>
            {!slots.slots.length ? <p className="public-message">{t('studio.noSlot')}</p> : (
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

        {error && <p className="request-error">{error}</p>}

        <div className="studio-response-actions">
          {status === 'delivered' && invitation.capsuleUrl && <a className="button button-primary" href={invitation.capsuleUrl} target="_blank" rel="noreferrer"><PlayCircle size={18} /> {t('studio.watch')}</a>}
          {showSlots && slots?.slots.length > 0 && <button className="button button-primary" type="button" disabled={!chosen || saving} onClick={book}>{saving ? t('studio.saving') : t('studio.book')}</button>}
          {status === 'booked' && !choosing && <button className="button studio-decline-button" type="button" onClick={startChange}>{t('studio.change')}</button>}
          {status === 'booked' && choosing && <button className="button studio-decline-button" type="button" onClick={() => { setChoosing(false); setChosen(''); setError(''); }}>{t('studio.keep')}</button>}
          {(status === 'invited' || status === 'booked') && !confirmDecline && <button className="button studio-decline-button" type="button" onClick={() => setConfirmDecline(true)}>{t('studio.decline')}</button>}
          {confirmDecline && <button className="button studio-decline-button is-danger" type="button" disabled={saving} onClick={decline}>{saving ? t('studio.saving') : t('studio.confirmDecline')}</button>}
        </div>
      </section>
    </main>
  );
}
