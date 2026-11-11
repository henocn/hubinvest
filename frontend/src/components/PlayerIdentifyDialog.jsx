import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import PhoneField from './PhoneField';
import PublicDialog from './PublicDialog';
import { api } from '../lib/api';
import { isValidPhone, toInternationalPhone } from '../lib/phone';
import { publicErrorMessage } from '../lib/public-error';

// Identifie le joueur une seule fois pour les deux jeux des Défis : parcours des stands et roue.
export default function PlayerIdentifyDialog({ onClose, onIdentified }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ lastName: '', firstName: '', email: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const field = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setSubmitted(true);
    if (!isValidPhone(form.phone)) return;
    setLoading(true);
    setError('');
    try {
      onIdentified(await api.createChallengePassport({ ...form, phone: toInternationalPhone(form.phone) }));
    } catch (requestError) {
      setError(publicErrorMessage(t, requestError));
      setLoading(false);
    }
  };

  return (
    <PublicDialog title={t('play.identifyTitle')} intro={t('play.identifyIntro')} onClose={onClose} locked={loading}>
      <form className="player-form" onSubmit={submit}>
        <div className="public-field-row">
          <label>{t('fields.lastName')}<input value={form.lastName} onChange={field('lastName')} maxLength={80} autoComplete="family-name" autoFocus required /></label>
          <label>{t('fields.firstName')}<input value={form.firstName} onChange={field('firstName')} maxLength={80} autoComplete="given-name" required /></label>
        </div>
        <label>{t('fields.email')}<input type="email" value={form.email} onChange={field('email')} maxLength={180} autoComplete="email" required /></label>
        <PhoneField value={form.phone} onChange={(phone) => setForm((current) => ({ ...current, phone }))} showError={submitted} />
        {error && <p className="request-error" role="alert">{error}</p>}
        <button className="button button-primary button-large" type="submit" disabled={loading}>{loading ? t('play.identifying') : t('play.identifySubmit')}<ArrowRight size={18} /></button>
      </form>
    </PublicDialog>
  );
}
