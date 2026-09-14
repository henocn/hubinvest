import { useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { api } from '../lib/api';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
});

export default function StudioInvitationPage({ token }) {
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.publicStudioInvitation(token)
      .then((data) => { if (active) setInvitation(data); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  const respond = async (status) => {
    setSaving(true);
    setError('');
    try {
      setInvitation(await api.respondStudioInvitation(token, status));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <main className="public-container studio-response-page"><p className="public-message">Chargement de l’invitation...</p></main>;
  if (!invitation) return <main className="public-container studio-response-page"><p className="public-message is-error">{error || 'Invitation introuvable.'}</p></main>;

  const scheduledAt = new Date(invitation.scheduledAt);
  const confirmed = invitation.status === 'confirmed';
  const declined = invitation.status === 'declined';

  return (
    <main className="public-container studio-response-page">
      <section className="studio-response-panel">
        <span className="public-eyebrow">Studio API-ZF</span>
        <h1>Invitation de {invitation.guestName}</h1>
        <p className="studio-subject">{invitation.subject}</p>

        <div className="studio-schedule">
          <span><CalendarDays size={20} /><strong>{dateFormatter.format(scheduledAt)}</strong></span>
          <span><Clock3 size={20} /><strong>{timeFormatter.format(scheduledAt)}</strong></span>
        </div>

        {confirmed && <div className="studio-response-status is-confirmed"><CheckCircle2 size={24} /><div><strong>Présence confirmée</strong><span>Votre réponse a bien été enregistrée.</span></div></div>}
        {declined && <div className="studio-response-status is-declined"><XCircle size={24} /><div><strong>Absence enregistrée</strong><span>Votre réponse a bien été enregistrée.</span></div></div>}
        {error && <p className="request-error">{error}</p>}

        <div className="studio-response-actions">
          {!confirmed && <button className="button button-primary" type="button" disabled={saving} onClick={() => respond('confirmed')}>{saving ? 'Enregistrement...' : 'Confirmer ma présence'}</button>}
          {!declined && <button className="button studio-decline-button" type="button" disabled={saving} onClick={() => respond('declined')}>{saving ? 'Enregistrement...' : 'Je ne serai pas disponible'}</button>}
        </div>
      </section>
    </main>
  );
}
