import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../lib/api';

const time = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', hour: '2-digit', minute: '2-digit' });
// Jour de Lomé (UTC) au format AAAA-MM-JJ.
const today = () => new Date().toISOString().slice(0, 10);

// Fixer (ou déplacer, avec « meeting ») un rendez-vous : on choisit le jour, puis un créneau libre et une table libre.
// Seuls les créneaux où le stand et au moins une table sont libres sont proposés ; le visiteur reçoit le rendez-vous par e-mail.
export default function B2bMeetingDialog({ proposal, meeting = null, token, onClose, onSaved }) {
  const editing = Boolean(meeting);
  const startDay = meeting && new Date(meeting.startsAt) > new Date() ? new Date(meeting.startsAt).toISOString().slice(0, 10) : today();
  const [date, setDate] = useState(startDay);
  const [data, setData] = useState(null);
  const [slot, setSlot] = useState(null);
  const [table, setTable] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setData(null);
    setSlot(null);
    setTable('');
    setError('');
    if (!date) return undefined;
    api.b2bSlots(token, proposal.id, date, meeting?.id)
      .then((result) => {
        if (!active) return;
        setData(result);
        // En modification, le créneau actuel reste choisi s'il est encore proposé.
        const current = meeting && result.slots.find((item) => new Date(item.startsAt).getTime() === new Date(meeting.startsAt).getTime());
        if (current) {
          setSlot(current);
          setTable(String(current.tables.includes(meeting.tableNumber) ? meeting.tableNumber : current.tables[0]));
        }
      })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [date, meeting, proposal.id, token]);

  const pick = (item) => {
    setSlot(item);
    setTable(String(item.tables[0]));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!slot || !table) return;
    setLoading(true);
    setError('');
    try {
      const values = { startsAt: slot.startsAt, tableNumber: Number(table) };
      if (editing) await api.rescheduleB2bMeeting(token, proposal.id, meeting.id, values);
      else await api.createB2bMeeting(token, proposal.id, values);
      await onSaved();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="meeting-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="drawer-header">
          <div><span className="eyebrow">{proposal.need?.title || 'Rencontre B2B'}</span><h2 id="meeting-title">{editing ? 'Modifier le rendez-vous' : 'Fixer un rendez-vous'}</h2></div>
          <button className="admin-icon-button" type="button" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </header>
        <form onSubmit={submit} className="drawer-form">
          <p className="field-hint">Rendez-vous de {data?.minutes ?? '…'} minutes avec {proposal.fullName}. {editing ? 'Il reçoit la nouvelle date par e-mail.' : 'Il reçoit le jour, l’heure et la table par e-mail.'}</p>
          <label>Jour<input type="date" value={date} min={today()} onChange={(event) => setDate(event.target.value)} required /></label>
          {!data && !error && <p className="panel-message">Recherche des créneaux libres…</p>}
          {data && !data.slots.length && <p className="panel-message">Aucun créneau libre ce jour-là.</p>}
          {data && data.slots.length > 0 && (
            <fieldset className="meeting-slots">
              <legend>Heure</legend>
              <div>
                {data.slots.map((item) => (
                  <button key={item.startsAt} type="button" className={`meeting-slot${slot?.startsAt === item.startsAt ? ' is-selected' : ''}`} onClick={() => pick(item)} aria-pressed={slot?.startsAt === item.startsAt}>
                    {time.format(new Date(item.startsAt))}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {slot && (
            <label>Table
              <select value={table} onChange={(event) => setTable(event.target.value)}>
                {slot.tables.map((number) => <option key={number} value={number}>Table {number}</option>)}
              </select>
            </label>
          )}
          {error && <p className="admin-form-error">{error}</p>}
          <footer className="drawer-actions">
            <button className="button button-secondary" type="button" onClick={onClose}>Annuler</button>
            <button className="button button-primary" type="submit" disabled={!slot || loading}>{loading ? 'Enregistrement…' : editing ? 'Déplacer le rendez-vous' : 'Fixer le rendez-vous'}</button>
          </footer>
        </form>
      </aside>
    </div>
  );
}
