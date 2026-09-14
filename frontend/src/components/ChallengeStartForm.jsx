import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { api } from '../lib/api';
import { useTranslation } from 'react-i18next';

export default function ChallengeStartForm({ onCreated }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ displayName: '', contact: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      onCreated(await api.createChallengePassport(form));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="challenge-start-form" onSubmit={submit}>
      <label>{t('challenge.name')}<input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} minLength={2} maxLength={120} autoComplete="name" required autoFocus /></label>
      <label>{t('challenge.contact')}<input value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value })} minLength={5} maxLength={180} required /></label>
      {error && <p className="request-error">{error}</p>}
      <button className="button button-primary" type="submit" disabled={loading}>{loading ? t('challenge.creating') : t('challenge.start')}<ArrowRight size={18} /></button>
    </form>
  );
}
