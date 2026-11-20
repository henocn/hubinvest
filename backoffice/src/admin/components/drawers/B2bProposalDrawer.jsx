import { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../../lib/api';

// Correction d'une demande B2B (coordonnées, message) ; la décision se prend avec les boutons du tableau.
export default function B2bProposalDrawer({ proposal, token, onClose, onSaved }) {
  const [form, setForm] = useState({ fullName: proposal.fullName, email: proposal.email, phone: proposal.phone || '', message: proposal.message });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const saved = await api.updateB2bProposal(token, proposal.id, { ...form, phone: form.phone || null });
      await onSaved(saved);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="b2b-proposal-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="drawer-header">
          <div><span className="eyebrow">{proposal.need?.title || 'Demande B2B'}</span><h2 id="b2b-proposal-title">Modifier la demande</h2></div>
          <button className="admin-icon-button" type="button" onClick={onClose} aria-label="Fermer"><X size={19} /></button>
        </header>
        <form onSubmit={submit} className="drawer-form">
          <label>Nom et prénom<input value={form.fullName} onChange={set('fullName')} minLength={2} maxLength={160} required /></label>
          <div className="field-row">
            <label>E-mail<input type="email" value={form.email} onChange={set('email')} maxLength={180} required /></label>
            <label>Téléphone<input type="tel" value={form.phone} onChange={set('phone')} minLength={6} maxLength={32} /></label>
          </div>
          <label>Message<textarea rows="7" value={form.message} onChange={set('message')} minLength={10} maxLength={4000} required /></label>
          {error && <p className="admin-form-error">{error}</p>}
          <footer className="drawer-actions">
            <button className="button button-secondary" type="button" onClick={onClose}>Annuler</button>
            <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Enregistrement…' : 'Enregistrer'}</button>
          </footer>
        </form>
      </aside>
    </div>
  );
}
