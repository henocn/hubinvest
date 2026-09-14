import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { api } from '../lib/api';
import { useTranslation } from 'react-i18next';

export default function ChallengeStartForm({ onCreated }) {
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      onCreated(await api.createChallengePassport({ displayName }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="challenge-start-form" onSubmit={submit}>
      <label>{t('challenge.name')}<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={2} maxLength={120} required autoFocus /></label>
      {error && <p className="request-error">{error}</p>}
      <button className="button button-primary" type="submit" disabled={loading}>{loading ? t('challenge.creating') : t('challenge.start')}<ArrowRight size={18} /></button>
    </form>
  );
}
