import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { api } from '../lib/api';

export default function ChallengeStartForm({ onCreated }) {
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
      <label>Votre prénom ou nom<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={2} maxLength={120} required autoFocus /></label>
      {error && <p className="request-error">{error}</p>}
      <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Création...' : 'Commencer'}<ArrowRight size={18} /></button>
    </form>
  );
}
