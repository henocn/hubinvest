import { useState } from 'react';
import AuthLayout from '../components/AuthLayout';
import PasswordField from '../components/PasswordField';
import { api } from '../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState('email');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.forgotPassword(email);
      setStep('code');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.resetPassword(email, code, password);
      localStorage.removeItem('hubinvest-session');
      setStep('done');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="login-copy">
        <h1>{step === 'email' ? 'Mot de passe oublié' : step === 'code' ? 'Code reçu' : 'Mot de passe modifié'}</h1>
        {step === 'email' && <p>Saisissez l’adresse e-mail de votre compte.</p>}
      </div>
      {step === 'done' ? (
        <div className="auth-result">
          <p className="form-success" role="status">Votre mot de passe a été modifié.</p>
          <a className="button button-primary" href="/connexion">Se connecter</a>
        </div>
      ) : step === 'email' ? (
        <form className="form-stack" onSubmit={submit}>
          <label>Adresse e-mail<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary button-large" type="submit" disabled={loading}>{loading ? 'Envoi…' : 'Envoyer le code'}</button>
          <a className="auth-back-link" href="/connexion">Retour à la connexion</a>
        </form>
      ) : (
        <form className="form-stack" onSubmit={reset}>
          <label>Code à 5 chiffres<input className="reset-code-input" inputMode="numeric" autoComplete="one-time-code" pattern="\d{5}" minLength={5} maxLength={5} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 5))} autoFocus required /></label>
          <label>Nouveau mot de passe<PasswordField autoComplete="new-password" minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary button-large" type="submit" disabled={loading}>{loading ? 'Modification…' : 'Modifier le mot de passe'}</button>
          <button className="auth-back-link auth-text-button" type="button" onClick={() => { setStep('email'); setCode(''); setPassword(''); setError(''); }}>Changer d’adresse</button>
        </form>
      )}
    </AuthLayout>
  );
}
