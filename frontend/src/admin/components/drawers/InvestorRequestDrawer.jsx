import { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../../lib/api';

export default function InvestorRequestDrawer({ investorRequest, onClose, onSaved, token }) {
  const [form, setForm] = useState({
    status: investorRequest.status,
    nextAction: investorRequest.nextAction || '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const saved = await api.updateInvestorRequest(token, investorRequest.id, {
        status: form.status,
        nextAction: form.nextAction || null,
      });
      await onSaved(saved);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="investor-request-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="drawer-header">
          <div><span className="eyebrow">Investor Desk</span><h2 id="investor-request-title">Suivre la demande</h2></div>
          <button className="admin-icon-button" type="button" onClick={onClose} aria-label="Fermer"><X size={19} /></button>
        </header>
        <section className="investor-request-detail">
          <div><span>Demandeur</span><strong>{investorRequest.fullName}</strong></div>
          <div><span>Coordonnées</span><a href={`mailto:${investorRequest.email}`}>{investorRequest.email}</a>{investorRequest.phone && <a href={`tel:${investorRequest.phone}`}>{investorRequest.phone}</a>}</div>
          <div><span>Projet ou besoin</span><p>{investorRequest.projectSummary}</p></div>
        </section>
        <form onSubmit={submit} className="drawer-form investor-followup-form">
          <label>Statut<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="new">Nouvelle</option><option value="in_progress">En cours</option><option value="closed">Clôturée</option></select></label>
          <label>Prochaine action<textarea rows="4" value={form.nextAction} onChange={(event) => setForm({ ...form, nextAction: event.target.value })} maxLength={255} /></label>
          {investorRequest.assignedTo && <p className="assignment-note">Responsable : {investorRequest.assignedTo.firstName} {investorRequest.assignedTo.lastName}</p>}
          {error && <p className="admin-form-error">{error}</p>}
          <footer className="drawer-actions">
            <button className="button button-secondary" type="button" onClick={onClose}>Annuler</button>
            <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Enregistrement...' : 'Enregistrer le suivi'}</button>
          </footer>
        </form>
      </aside>
    </div>
  );
}
