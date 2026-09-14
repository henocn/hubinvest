import { useState } from 'react';
import { ArrowRight, Handshake } from 'lucide-react';
import { api } from '../lib/api';

export default function B2bProposalForm({ need }) {
  const [form, setForm] = useState({ message: '', fullName: '', email: '', phone: '', consentOccupant: false });
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [received, setReceived] = useState(false);
  const field = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  const submit = async (event) => {
    event.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.createB2bProposal(need.id, form);
      setReceived(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  if (received) {
    return <div className="b2b-success" role="status"><Handshake size={24} /><div><h2>Proposition transmise</h2><p>{need.occupant.name} peut maintenant étudier votre demande.</p></div></div>;
  }

  return (
    <form className="b2b-proposal-form" onSubmit={submit}>
      <div className="investor-step-progress" aria-label={`Étape ${step} sur 2`}><span>{step} / 2</span><div aria-hidden="true"><i className="is-complete" /><i className={step === 2 ? 'is-complete' : ''} /></div></div>
      {step === 1 ? (
        <div className="investor-step">
          <label>Votre proposition<textarea rows="6" minLength={10} maxLength={4000} value={form.message} onChange={(event) => field('message', event.target.value)} autoFocus required /></label>
          <button className="button button-primary investor-next-button" type="submit">Continuer <ArrowRight size={17} /></button>
        </div>
      ) : (
        <div className="investor-step">
          <header><h2>Vos coordonnées</h2></header>
          <label>Nom complet<input value={form.fullName} onChange={(event) => field('fullName', event.target.value)} minLength={2} maxLength={160} autoComplete="name" autoFocus required /></label>
          <div className="public-field-row">
            <label>Adresse e-mail<input type="email" value={form.email} onChange={(event) => field('email', event.target.value)} maxLength={180} autoComplete="email" required /></label>
            <label><span className="public-field-label">Téléphone <small>facultatif</small></span><input type="tel" inputMode="tel" value={form.phone} onChange={(event) => field('phone', event.target.value)} maxLength={32} autoComplete="tel" /></label>
          </div>
          <label className="request-consent investor-consent"><input type="checkbox" checked={form.consentOccupant} onChange={(event) => field('consentOccupant', event.target.checked)} required /><span>J’accepte que {need.occupant.name} utilise mes coordonnées pour répondre à cette proposition.</span></label>
          {error && <p className="request-error" role="alert">{error}</p>}
          <div className="investor-form-actions"><button className="button button-secondary" type="button" onClick={() => setStep(1)} disabled={loading}>Retour</button><button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Envoi en cours…' : 'Transmettre'}</button></div>
        </div>
      )}
    </form>
  );
}
