import { useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { api } from '../lib/api';
import { useTranslation } from 'react-i18next';
import { publicErrorMessage } from '../lib/public-error';

export default function StudioInvitationPage({ token }) {
  const { t, i18n } = useTranslation();
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.publicStudioInvitation(token)
      .then((data) => { if (active) setInvitation(data); })
      .catch((requestError) => { if (active) setError(publicErrorMessage(t, requestError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [t, token]);

  const respond = async (status) => {
    setSaving(true);
    setError('');
    try {
      setInvitation(await api.respondStudioInvitation(token, status));
    } catch (requestError) {
      setError(publicErrorMessage(t, requestError));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <main className="public-container studio-response-page"><p className="public-message">{t('studio.loading')}</p></main>;
  if (!invitation) return <main className="public-container studio-response-page"><p className="public-message is-error">{error || t('studio.notFound')}</p></main>;

  const scheduledAt = new Date(invitation.scheduledAt);
  const locale = i18n.resolvedLanguage?.startsWith('en') ? 'en-GB' : 'fr-FR';
  const date = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(scheduledAt);
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(scheduledAt);
  const confirmed = invitation.status === 'confirmed';
  const declined = invitation.status === 'declined';

  return (
    <main className="public-container studio-response-page">
      <section className="studio-response-panel">
        <span className="public-eyebrow">{t('studio.eyebrow')}</span>
        <h1>{t('studio.invitation', { name: invitation.guestName })}</h1>
        <p className="studio-subject">{invitation.subject}</p>

        <div className="studio-schedule">
          <span><CalendarDays size={20} /><strong>{date}</strong></span>
          <span><Clock3 size={20} /><strong>{time}</strong></span>
        </div>

        {confirmed && <div className="studio-response-status is-confirmed"><CheckCircle2 size={24} /><div><strong>{t('studio.confirmed')}</strong><span>{t('studio.saved')}</span></div></div>}
        {declined && <div className="studio-response-status is-declined"><XCircle size={24} /><div><strong>{t('studio.declined')}</strong><span>{t('studio.saved')}</span></div></div>}
        {error && <p className="request-error">{error}</p>}

        <div className="studio-response-actions">
          {!confirmed && <button className="button button-primary" type="button" disabled={saving} onClick={() => respond('confirmed')}>{saving ? t('studio.saving') : t('studio.confirm')}</button>}
          {!declined && <button className="button studio-decline-button" type="button" disabled={saving} onClick={() => respond('declined')}>{saving ? t('studio.saving') : t('studio.decline')}</button>}
        </div>
      </section>
    </main>
  );
}
