import { useRef, useState } from 'react';
import { api } from '../lib/api';
import { useTranslation } from 'react-i18next';
import { publicErrorMessage } from '../lib/public-error';
import PhoneField from './PhoneField';
import PublicDialog from './PublicDialog';
import { isValidPhone, toInternationalPhone } from '../lib/phone';

// Identifiant de la demande (un envoi répété n'en crée pas deux) ; crypto.randomUUID n'existe qu'en HTTPS.
const newRequestId = () => {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

// « Prendre contact » avec un stand : la demande s'ouvre dans une fenêtre (nom, téléphone, demande facultative).
export default function ContactRequestForm({ stand, onClose }) {
  const { t } = useTranslation();
  const requestId = useRef(null);
  if (!requestId.current) requestId.current = newRequestId();
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
    <PublicDialog title={t('contact.title')} intro={received ? null : t('contact.intro', { name: stand.name })} onClose={onClose} locked={loading} className="contact-dialog">
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
    </PublicDialog>
  );
}
