import { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../../lib/api';

const toLocalInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

export default function StudioInvitationDrawer({ invitation, onClose, onSaved, token }) {
  const isEditing = Boolean(invitation);
  const [form, setForm] = useState({
    guestName: invitation?.guestName || '',
    subject: invitation?.subject || '',
    scheduledAt: toLocalInput(invitation?.scheduledAt),
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const values = {
        guestName: form.guestName,
        subject: form.subject,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
      };
      const saved = isEditing
        ? await api.updateStudioInvitation(token, invitation.id, values)
        : await api.createStudioInvitation(token, values);
      await onSaved(saved);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="studio-invitation-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="drawer-header">
          <div><span className="eyebrow">Studio</span><h2 id="studio-invitation-title">{isEditing ? 'Modifier l’invitation' : 'Créer une invitation'}</h2></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fermer"><X size={19} /></button>
        </header>
        <form onSubmit={submit} className="drawer-form">
          <label>Nom de l’invité<input value={form.guestName} onChange={(event) => setForm({ ...form, guestName: event.target.value })} minLength={2} maxLength={160} required autoFocus /></label>
          <label>Sujet<input value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} minLength={3} maxLength={180} required /></label>
          <label>Date et heure<input type="datetime-local" value={form.scheduledAt} onChange={(event) => setForm({ ...form, scheduledAt: event.target.value })} required /></label>
          {error && <p className="form-error">{error}</p>}
          <footer className="drawer-actions">
            <button className="button button-secondary" type="button" onClick={onClose}>Annuler</button>
            <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Enregistrement...' : isEditing ? 'Enregistrer les modifications' : 'Créer l’invitation'}</button>
          </footer>
        </form>
      </aside>
    </div>
  );
}
