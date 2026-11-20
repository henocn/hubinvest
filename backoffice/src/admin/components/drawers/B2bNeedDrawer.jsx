import { X } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../lib/api';

// Création ou modification d'un besoin B2B ; les demandes reçues se traitent sur la fiche du besoin.
export default function B2bNeedDrawer({ need, occupants, fixedOccupant, token, onClose, onSaved }) {
  const isEditing = Boolean(need);
  const [form, setForm] = useState({ occupantId: need?.occupantId || fixedOccupant?.id || '', title: need?.title || '', description: need?.description || '', status: need?.status || 'open' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const values = { occupantId: form.occupantId, title: form.title, description: form.description, ...(isEditing && { status: form.status }) };
      const saved = isEditing ? await api.updateB2bNeed(token, need.id, values) : await api.createB2bNeed(token, values);
      await onSaved(saved);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="b2b-need-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="drawer-header"><h2 id="b2b-need-title">{isEditing ? 'Modifier le besoin' : 'Nouveau besoin B2B'}</h2><button className="admin-icon-button" type="button" onClick={onClose} aria-label="Fermer"><X size={19} /></button></header>
        <form onSubmit={submit} className="drawer-form">
          {!fixedOccupant && <label>Stand<select value={form.occupantId} onChange={(event) => setForm({ ...form, occupantId: event.target.value })} required><option value="">Sélectionner un stand</option>{occupants.map((occupant) => <option key={occupant.id} value={occupant.id}>{occupant.name}</option>)}</select></label>}
          <label>Titre<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} minLength={3} maxLength={180} required /></label>
          <label>Description<textarea rows="6" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} minLength={10} maxLength={6000} required /></label>
          {isEditing && <label>Statut<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="open">Ouvert</option><option value="closed">Fermé</option></select></label>}
          {error && <p className="admin-form-error">{error}</p>}
          <footer className="drawer-actions"><button className="button button-secondary" type="button" onClick={onClose}>Annuler</button><button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Enregistrement…' : 'Enregistrer'}</button></footer>
        </form>
      </aside>
    </div>
  );
}
