import { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../../lib/api';

export default function OccupantDrawer({ occupant, onClose, onSaved, token }) {
  const isEditing = Boolean(occupant);
  const [form, setForm] = useState(() => ({
    name: occupant?.name || '',
    standLabel: occupant?.standLabel || '',
    activity: occupant?.activity || '',
    status: occupant?.status || 'active',
  }));
  const [coverFile, setCoverFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const values = {
        name: form.name,
        standLabel: form.standLabel || null,
        activity: form.activity || null,
        status: form.status,
      };
      let saved = isEditing
        ? await api.updateOccupant(token, occupant.id, values)
        : await api.createOccupant(token, values);
      if (coverFile) saved = await api.uploadOccupantCover(token, saved.id, coverFile);
      await onSaved(saved);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="occupant-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="drawer-header">
          <div><span className="eyebrow">{isEditing ? 'Modification' : 'Nouvel occupant'}</span><h2 id="occupant-title">{isEditing ? 'Modifier le stand' : 'Créer un stand'}</h2></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fermer"><X size={19} /></button>
        </header>
        <form onSubmit={submit} className="drawer-form">
          <label>Nom de la structure<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} minLength={2} required autoFocus /></label>
          <label>Emplacement du stand<input value={form.standLabel} onChange={(event) => setForm({ ...form, standLabel: event.target.value })} /></label>
          <label>Image de couverture<input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={(event) => setCoverFile(event.target.files?.[0] || null)} required={!occupant?.coverImageUrl} /></label>
          <label>Activité<textarea rows="5" value={form.activity} onChange={(event) => setForm({ ...form, activity: event.target.value })} /></label>
          <label>Statut du stand<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="active">Actif</option><option value="inactive">Inactif</option></select></label>
          {error && <p className="form-error">{error}</p>}
          <footer className="drawer-actions">
            <button className="button button-secondary" type="button" onClick={onClose}>Annuler</button>
            <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Enregistrement...' : isEditing ? 'Enregistrer les modifications' : "Créer l’occupant"}</button>
          </footer>
        </form>
      </aside>
    </div>
  );
}
