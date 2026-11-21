import { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../../lib/api';

// Saisie d'une demande reçue hors du site (au guichet, au téléphone…). Elle démarre « À traiter » ;
// la classe, les relances et les rendez-vous se gèrent ensuite sur sa fiche.
export default function InvestorRequestDrawer({ onClose, onSaved, token }) {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', projectSummary: '', consentApizf: false });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const saved = await api.createInvestorRequest(token, { ...form, phone: form.phone || null });
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
          <div><span className="eyebrow">Investor Desk</span><h2 id="investor-request-title">Nouvelle demande</h2></div>
          <button className="admin-icon-button" type="button" onClick={onClose} aria-label="Fermer"><X size={19} /></button>
        </header>
        <form onSubmit={submit} className="drawer-form">
          <label>Nom et prénom<input value={form.fullName} onChange={set('fullName')} minLength={2} maxLength={160} required /></label>
          <div className="field-row">
            <label>E-mail<input type="email" value={form.email} onChange={set('email')} maxLength={180} required /></label>
            <label>Téléphone<input type="tel" value={form.phone} onChange={set('phone')} minLength={6} maxLength={32} /></label>
          </div>
          <label>Projet ou besoin<textarea rows="5" value={form.projectSummary} onChange={set('projectSummary')} minLength={10} maxLength={6000} required /></label>
          <label className="checkbox-field"><input type="checkbox" checked={form.consentApizf} onChange={set('consentApizf')} /> La personne accepte que l’API-ZF reçoive son projet</label>
          {error && <p className="admin-form-error">{error}</p>}
          <footer className="drawer-actions">
            <button className="button button-secondary" type="button" onClick={onClose}>Annuler</button>
            <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Enregistrement…' : 'Ajouter la demande'}</button>
          </footer>
        </form>
      </aside>
    </div>
  );
}
