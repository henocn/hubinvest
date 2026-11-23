import { useState } from 'react';
import { X } from 'lucide-react';
import { programTypeLabels } from '../../constants/access';
import { api } from '../../lib/api';

// Extrait le jour (AAAA-MM-JJ) d'une date, à l'heure du Hub (Lomé = UTC+0).
const toDayInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

// Extrait l'heure (HH:MM) d'une date, à l'heure du Hub (Lomé = UTC+0).
const toTimeInput = (value) => (value ? new Date(value).toISOString().slice(11, 16) : '');

// Assemble un jour et une heure saisis à l'heure du Hub en date ISO.
const toIso = (day, time) => new Date(`${day}T${time || '00:00'}:00.000Z`).toISOString();

// Tiroir de création et de modification d'un élément du programme du Hub.
export default function ProgramEventDrawer({ programEvent, occupants, onClose, onSaved, token }) {
  const isEditing = Boolean(programEvent);
  const [form, setForm] = useState({
    type: programEvent?.type || 'animation',
    occupantId: programEvent?.occupantId || '',
    title: programEvent?.type === 'spotlight' ? '' : programEvent?.title || '',
    description: programEvent?.description || '',
    location: programEvent?.location || '',
    day: toDayInput(programEvent?.startsAt),
    startTime: toTimeInput(programEvent?.startsAt),
    endTime: toTimeInput(programEvent?.endsAt),
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isSpotlight = form.type === 'spotlight';

  // Met à jour un champ du formulaire.
  const setField = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  // Envoie l'élément au serveur puis ferme le tiroir.
  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const values = isSpotlight
        ? {
          type: 'spotlight',
          occupantId: form.occupantId,
          title: 'À l’affiche',
          description: form.description,
          location: '',
          startsAt: toIso(form.day),
          endsAt: null,
        }
        : {
          type: form.type,
          occupantId: form.occupantId || null,
          title: form.title,
          description: form.description,
          location: form.location,
          startsAt: toIso(form.day, form.startTime),
          endsAt: form.endTime ? toIso(form.day, form.endTime) : null,
        };
      const saved = isEditing
        ? await api.updateProgramEvent(token, programEvent.id, values)
        : await api.createProgramEvent(token, values);
      await onSaved(saved);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="program-event-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="drawer-header">
          <div><span className="eyebrow">Programme</span><h2 id="program-event-title">{isEditing ? 'Modifier l’élément' : 'Ajouter au programme'}</h2></div>
          <button className="admin-icon-button" type="button" onClick={onClose} aria-label="Fermer"><X size={19} /></button>
        </header>
        <form onSubmit={submit} className="drawer-form">
          <label>Type<select value={form.type} onChange={setField('type')} required>{Object.entries(programTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          {!isSpotlight && <label>Titre<input value={form.title} onChange={setField('title')} minLength={2} maxLength={180} required autoFocus /></label>}
          <label>
            Stand
            <select value={form.occupantId} onChange={setField('occupantId')} required={isSpotlight}>
              <option value="">{isSpotlight ? 'Sélectionner un stand' : 'Tout le Hub'}</option>
              {occupants.map((occupant) => <option key={occupant.id} value={occupant.id}>{occupant.name}</option>)}
            </select>
            {isSpotlight && <span className="field-hint">Ce stand sera présenté en tête de l’accueil toute la journée.</span>}
          </label>
          <label>Jour<input type="date" value={form.day} onChange={setField('day')} required /></label>
          {!isSpotlight && (
            <div className="drawer-field-row">
              <label>Début<input type="time" value={form.startTime} onChange={setField('startTime')} required /></label>
              <label>Fin<input type="time" value={form.endTime} onChange={setField('endTime')} min={form.startTime || undefined} /></label>
            </div>
          )}
          {!isSpotlight && (
            <label>
              Lieu
              <input value={form.location} onChange={setField('location')} maxLength={120} />
              <span className="field-hint">Laissez vide pour afficher l’emplacement du stand.</span>
            </label>
          )}
          <label>
            {isSpotlight ? 'Accroche' : 'Description'}
            <textarea value={form.description} onChange={setField('description')} rows={4} maxLength={2000} />
            {isSpotlight && <span className="field-hint">Laissez vide pour reprendre l’activité du stand.</span>}
          </label>
          {error && <p className="admin-form-error">{error}</p>}
          <footer className="drawer-actions">
            <button className="button button-secondary" type="button" onClick={onClose}>Annuler</button>
            <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Enregistrement...' : isEditing ? 'Enregistrer les modifications' : 'Ajouter au programme'}</button>
          </footer>
        </form>
      </aside>
    </div>
  );
}
