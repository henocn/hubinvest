import { useRef, useState } from 'react';
import { api } from '../lib/api';
import { useTranslation } from 'react-i18next';
import { publicErrorMessage } from '../lib/public-error';

export default function ContactRequestForm({ stand }) {
  const { t } = useTranslation();
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
      setError(publicErrorMessage(t, requestError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="request-panel" aria-labelledby="request-title">
      <div className="request-intro">
        <h2 id="request-title">{t('contact.title')}</h2>
        <p>{t('contact.intro', { name: stand.name })}</p>
      </div>
      {received ? (
        <p className="request-success" role="status">{t('contact.success')}</p>
      ) : (
        <form className="request-form" onSubmit={submit}>
          <label>{t('contact.fullName')}<input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} minLength={2} maxLength={160} autoComplete="name" required /></label>
          <label>{t('contact.phone')}<input type="tel" inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} minLength={6} maxLength={32} autoComplete="tel" required /></label>
          <label>{t('contact.request')} <span className="request-optional">{t('common.optional')}</span><textarea value={form.need} onChange={(event) => setForm({ ...form, need: event.target.value })} rows={3} maxLength={4000} /></label>
          <label className="request-consent">
            <input type="checkbox" checked={form.consentOccupant} onChange={(event) => setForm({ ...form, consentOccupant: event.target.checked })} required />
            <span>{t('contact.consent', { name: stand.name })}</span>
          </label>
          {error && <p className="request-error" role="alert">{error}</p>}
          <button className="button button-primary" type="submit" disabled={loading}>{loading ? t('common.sending') : t('contact.submit')}</button>
        </form>
      )}
    </section>
  );
}
