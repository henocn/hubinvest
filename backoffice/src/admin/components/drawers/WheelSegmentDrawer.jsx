import { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../../lib/api';

export default function WheelSegmentDrawer({ segment, token, onClose, onSaved }) {
  const isEditing = Boolean(segment);
  const [form, setForm] = useState({
    kind: segment?.kind || 'prize',
    label: segment?.label || '',
    quantity: segment?.quantity ?? 0,
    isActive: segment?.isActive ?? true,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isPrize = form.kind === 'prize';

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const values = {
        kind: form.kind,
        label: form.label,
        isActive: form.isActive,
        ...(isPrize && { quantity: Number(form.quantity) }),
      };
      const saved = isEditing
        ? await api.updateWheelSegment(token, segment.id, values)
        : await api.createWheelSegment(token, values);
      await onSaved(saved);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="wheel-segment-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="drawer-header">
          <div><span className="eyebrow">Roue</span><h2 id="wheel-segment-title">{isEditing ? 'Modifier la case' : 'Nouvelle case'}</h2></div>
          <button className="admin-icon-button" type="button" onClick={onClose} aria-label="Fermer"><X size={19} /></button>
        </header>
        <form onSubmit={submit} className="drawer-form">
          <label>Type<select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value })}><option value="prize">Lot à gagner</option><option value="lose">Case perdante</option></select></label>
          <label>Texte sur la roue<input value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} maxLength={60} required autoFocus /></label>
          {isPrize && <label>Quantité totale<input type="number" min={segment?.awarded || 0} max={100000} step={1} value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} required /></label>}
          <label>Sur la roue<select value={form.isActive ? 'shown' : 'hidden'} onChange={(event) => setForm({ ...form, isActive: event.target.value === 'shown' })}><option value="shown">Affichée</option><option value="hidden">Masquée</option></select></label>
          {error && <p className="admin-form-error">{error}</p>}
          <footer className="drawer-actions">
            <button className="button button-secondary" type="button" onClick={onClose}>Annuler</button>
            <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Enregistrement...' : isEditing ? 'Enregistrer' : 'Ajouter la case'}</button>
          </footer>
        </form>
      </aside>
    </div>
  );
}
