import { useRef, useState } from 'react';
import { api } from '../lib/api';
import { useTranslation } from 'react-i18next';
import { publicErrorMessage } from '../lib/public-error';
import PhoneField from './PhoneField';
import { isValidPhone, toInternationalPhone } from '../lib/phone';

export default function ContactRequestForm({ stand }) {
  const { t } = useTranslation();
  const requestId = useRef(crypto.randomUUID());
  const [form, setForm] = useState({ fullName: '', phone: '', need: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [received, setReceived] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSubmitted(true);
    if (!isValidPhone(form.phone)) return;
    setLoading(true);
    setError('');
    try {
      await api.requestContact(stand.slug, { ...form, phone: toInternationalPhone(form.phone), consentOccupant: true, id: requestId.current });
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
          <PhoneField label={t('contact.phone')} value={form.phone} onChange={(phone) => setForm((current) => ({ ...current, phone }))} showError={submitted} />
          <label>{t('contact.request')} <span className="request-optional">{t('common.optional')}</span><textarea value={form.need} onChange={(event) => setForm({ ...form, need: event.target.value })} rows={3} maxLength={4000} /></label>
          {error && <p className="request-error" role="alert">{error}</p>}
          <button className="button button-primary" type="submit" disabled={loading}>{loading ? t('common.sending') : t('contact.submit')}</button>
        </form>
      )}
    </section>
  );
}
