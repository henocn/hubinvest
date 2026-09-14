import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';

export default function ChallengeValidationForm({ token }) {
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      setResult(await api.validateChallengePassage(token, code));
      setCode('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form className="challenge-validation-form" onSubmit={submit}>
        <label>Code participant<input className="challenge-code-input" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} minLength={8} maxLength={8} autoCapitalize="characters" autoComplete="off" required autoFocus /></label>
        {error && <p className="panel-error">{error}</p>}
        <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Validation...' : 'Valider le passage'}</button>
      </form>
      {result && <div className="challenge-validation-success"><CheckCircle2 size={24} /><div><strong>Passage validé pour {result.displayName}</strong><span>{result.passageCount} passage{result.passageCount > 1 ? 's' : ''} sur {result.requiredPassages}</span></div></div>}
    </>
  );
}
