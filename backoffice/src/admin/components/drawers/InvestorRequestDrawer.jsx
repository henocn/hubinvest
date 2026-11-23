import { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../../lib/api';
import { guichetLabels } from '../../constants/access';
import PhoneInputField from '../../../components/PhoneInputField';

// Saisie d'un contact reçu hors du site (passage au guichet, appel…). Il démarre « À traiter » ;
// le diagnostic ou la fiche de difficulté, la classe, les relances et les rendez-vous se gèrent ensuite sur sa fiche.
export default function InvestorRequestDrawer({ onClose, onSaved, token }) {
  const [form, setForm] = useState({ guichet: 'project', fullName: '', email: '', phone: '', organization: '', projectSummary: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const saved = await api.createInvestorRequest(token, { ...form, phone: form.phone || null, organization: form.organization || null });
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
          <div><span className="eyebrow">Guichets</span><h2 id="investor-request-title">Nouveau contact</h2></div>
          <button className="admin-icon-button" type="button" onClick={onClose} aria-label="Fermer"><X size={19} /></button>
        </header>
        <form onSubmit={submit} className="drawer-form">
          <label>Guichet<select value={form.guichet} onChange={set('guichet')}>{Object.entries(guichetLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Nom et prénom<input value={form.fullName} onChange={set('fullName')} minLength={2} maxLength={160} required /></label>
          <div className="field-row">
            <label>E-mail<input type="email" value={form.email} onChange={set('email')} maxLength={180} required /></label>
            <PhoneInputField value={form.phone} onChange={(phone) => setForm((current) => ({ ...current, phone }))} />
          </div>
          <label>Entreprise ou structure<input value={form.organization} onChange={set('organization')} maxLength={160} /></label>
          <label>Projet ou besoin<textarea rows="5" value={form.projectSummary} onChange={set('projectSummary')} minLength={10} maxLength={6000} required /></label>
          {error && <p className="admin-form-error">{error}</p>}
          <footer className="drawer-actions">
            <button className="button button-secondary" type="button" onClick={onClose}>Annuler</button>
            <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Enregistrement…' : 'Ajouter le contact'}</button>
          </footer>
        </form>
      </aside>
    </div>
  );
}
