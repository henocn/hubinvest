import { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../../lib/api';

// Saisie d'une demande reçue hors du site (au guichet, au téléphone…).
function NewInvestorRequestForm({ token, onClose, onSaved }) {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', projectSummary: '', status: 'new', nextAction: '', consentApizf: false });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const saved = await api.createInvestorRequest(token, { ...form, phone: form.phone || null, nextAction: form.nextAction || null });
      await onSaved(saved);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="drawer-form">
      <label>Nom et prénom<input value={form.fullName} onChange={set('fullName')} minLength={2} maxLength={160} required /></label>
      <div className="field-row">
        <label>E-mail<input type="email" value={form.email} onChange={set('email')} maxLength={180} required /></label>
        <label>Téléphone<input type="tel" value={form.phone} onChange={set('phone')} minLength={6} maxLength={32} /></label>
      </div>
      <label>Projet ou besoin<textarea rows="5" value={form.projectSummary} onChange={set('projectSummary')} minLength={10} maxLength={6000} required /></label>
      <label>Statut<select value={form.status} onChange={set('status')}><option value="new">Nouvelle</option><option value="in_progress">En cours</option><option value="closed">Clôturée</option></select></label>
      <label>Prochaine action<input value={form.nextAction} onChange={set('nextAction')} maxLength={255} /></label>
      <label className="checkbox-field"><input type="checkbox" checked={form.consentApizf} onChange={set('consentApizf')} /> La personne accepte que l’API-ZF reçoive son projet</label>
      {error && <p className="admin-form-error">{error}</p>}
      <footer className="drawer-actions">
        <button className="button button-secondary" type="button" onClick={onClose}>Annuler</button>
        <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Enregistrement...' : 'Ajouter la demande'}</button>
      </footer>
    </form>
  );
}

// Suivi d'une demande existante : statut et prochaine action.
function FollowUpForm({ investorRequest, token, onClose, onSaved }) {
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
    <>
      <section className="investor-request-detail">
        <div><span>Demandeur</span><strong>{investorRequest.fullName}</strong></div>
        <div><span>Coordonnées</span><a href={`mailto:${investorRequest.email}`}>{investorRequest.email}</a>{investorRequest.phone && <a href={`tel:${investorRequest.phone}`}>{investorRequest.phone}</a>}</div>
        <div><span>Projet ou besoin</span><p>{investorRequest.projectSummary}</p></div>
      </section>
      <form onSubmit={submit} className="drawer-form investor-followup-form">
        <label>Statut<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="new">Nouvelle</option><option value="in_progress">En cours</option><option value="closed">Clôturée</option></select></label>
        <label>Prochaine action<textarea rows="4" value={form.nextAction} onChange={(event) => setForm({ ...form, nextAction: event.target.value })} maxLength={255} /></label>
        {error && <p className="admin-form-error">{error}</p>}
        <footer className="drawer-actions">
          <button className="button button-secondary" type="button" onClick={onClose}>Annuler</button>
          <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Enregistrement...' : 'Enregistrer le suivi'}</button>
        </footer>
      </form>
    </>
  );
}

export default function InvestorRequestDrawer({ investorRequest, onClose, onSaved, token }) {
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="investor-request-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="drawer-header">
          <div><span className="eyebrow">Investor Desk</span><h2 id="investor-request-title">{investorRequest ? 'Suivre la demande' : 'Nouvelle demande'}</h2></div>
          <button className="admin-icon-button" type="button" onClick={onClose} aria-label="Fermer"><X size={19} /></button>
        </header>
        {investorRequest
          ? <FollowUpForm investorRequest={investorRequest} token={token} onClose={onClose} onSaved={onSaved} />
          : <NewInvestorRequestForm token={token} onClose={onClose} onSaved={onSaved} />}
      </aside>
    </div>
  );
}
