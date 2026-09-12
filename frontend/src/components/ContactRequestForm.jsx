import { useRef, useState } from 'react';
import { api } from '../lib/api';

export default function ContactRequestForm({ stand }) {
  const requestId = useRef(crypto.randomUUID());
  const [form, setForm] = useState({ fullName: '', phone: '', need: '', consentOccupant: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [received, setReceived] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.requestContact(stand.slug, { ...form, id: requestId.current });
      setReceived(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="request-panel" aria-labelledby="request-title">
      <div className="request-intro">
        <span className="public-eyebrow">Prendre contact</span>
        <h2 id="request-title">Être recontacté par ce stand</h2>
        <p>Adressez votre demande à l’équipe de {stand.name}.</p>
      </div>
      {received ? (
        <p className="request-success" role="status">Votre demande a été enregistrée. L’équipe de ce stand pourra vous recontacter.</p>
      ) : (
        <form className="request-form" onSubmit={submit}>
          <label>Nom complet<input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} minLength={2} maxLength={160} autoComplete="name" required /></label>
          <label>Téléphone<input type="tel" inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} minLength={6} maxLength={32} autoComplete="tel" required /></label>
          <label>Votre demande <span className="request-optional">facultatif</span><textarea value={form.need} onChange={(event) => setForm({ ...form, need: event.target.value })} rows={3} maxLength={4000} /></label>
          <label className="request-consent">
            <input type="checkbox" checked={form.consentOccupant} onChange={(event) => setForm({ ...form, consentOccupant: event.target.checked })} required />
            <span>J’accepte que {stand.name} utilise mes coordonnées pour répondre à cette demande.</span>
          </label>
          {error && <p className="request-error" role="alert">{error}</p>}
          <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Envoi en cours…' : 'Envoyer ma demande'}</button>
        </form>
      )}
    </section>
  );
}
