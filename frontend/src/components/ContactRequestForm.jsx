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

// Quand recontacter le visiteur : sa réponse donne la classe du contact (A rapidement, B plus tard, C opportunités API-ZF).
const WHEN = [['A', 'contact.whenSoon'], ['B', 'contact.whenLater'], ['C', 'contact.whenInfo']];

// « Prendre contact » avec un stand, en deux temps pour ne pas décourager : d'abord nom, téléphone, e-mail et demande ;
// après « Continuer », quand être recontacté et l'entreprise (facultatifs), puis l'envoi.
export default function ContactRequestForm({ stand, onClose }) {
  const { t } = useTranslation();
  const requestId = useRef(null);
  if (!requestId.current) requestId.current = newRequestId();
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', need: '', qualification: '', company: '' });
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [received, setReceived] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const field = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  const next = (event) => {
    event.preventDefault();
    setSubmitted(true);
    if (!isValidPhone(form.phone)) return;
    setError('');
    setStep(2);
  };

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.requestContact(stand.slug, {
        id: requestId.current,
        fullName: form.fullName,
        phone: toInternationalPhone(form.phone),
        email: form.email.trim(),
        need: form.need,
        company: form.company.trim(),
        qualification: form.qualification || null,
        consentOccupant: true,
      });
      setReceived(true);
    } catch (requestError) {
      setError(publicErrorMessage(t, requestError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicDialog title={t('contact.title')} intro={received || step === 2 ? null : t('contact.intro', { name: stand.name })} onClose={onClose} locked={loading} className="contact-dialog">
      {received ? (
        <p className="request-success" role="status">{t('contact.success')}</p>
      ) : step === 1 ? (
        <form className="request-form" onSubmit={next}>
          <label>{t('contact.fullName')}<input value={form.fullName} onChange={(event) => field('fullName', event.target.value)} minLength={2} maxLength={160} autoComplete="name" required /></label>
          <div className="public-field-row">
            <PhoneField label={t('contact.phone')} value={form.phone} onChange={(phone) => field('phone', phone)} showError={submitted} />
            <label>{t('fields.email')}<input type="email" value={form.email} onChange={(event) => field('email', event.target.value)} maxLength={180} autoComplete="email" required /></label>
          </div>
          <label>{t('contact.request')} <span className="request-optional">{t('common.optional')}</span><textarea value={form.need} onChange={(event) => field('need', event.target.value)} rows={3} maxLength={4000} /></label>
          <button className="button button-primary" type="submit">{t('common.continue')}</button>
        </form>
      ) : (
        <form className="request-form" onSubmit={submit}>
          <fieldset className="contact-when">
            <legend>{t('contact.when')}</legend>
            {WHEN.map(([value, key]) => (
              <label key={value} className={form.qualification === value ? 'is-selected' : ''}>
                <input type="radio" name="contact-when" value={value} checked={form.qualification === value} onChange={() => field('qualification', value)} />
                <span>{t(key)}</span>
              </label>
            ))}
          </fieldset>
          <label>{t('contact.company')} <span className="request-optional">{t('common.optional')}</span><input value={form.company} onChange={(event) => field('company', event.target.value)} maxLength={160} autoComplete="organization" /></label>
          {error && <p className="request-error" role="alert">{error}</p>}
          <div className="contact-step-actions">
            <button className="button button-secondary" type="button" onClick={() => setStep(1)} disabled={loading}>{t('common.back')}</button>
            <button className="button button-primary" type="submit" disabled={loading}>{loading ? t('common.sending') : t('contact.submit')}</button>
          </div>
        </form>
      )}
    </PublicDialog>
  );
}
