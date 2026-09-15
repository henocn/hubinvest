import { useState } from 'react';
import AuthLayout from '../components/AuthLayout';
import PasswordInput from '../components/PasswordInput';

export default function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await onLogin(form);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
        <div className="login-copy"><h1>Connexion</h1><p>Gérez les occupants et les accès à la plateforme.</p></div>
        <form onSubmit={submit} className="form-stack">
          <label>Adresse e-mail<input type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
          <label>Mot de passe<PasswordInput autoComplete="current-password" minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></label>
          <a className="auth-form-link" href="/mot-de-passe-oublie">Mot de passe oublié ?</a>
          {error && <p className="form-error">{error}</p>}
          <button className="button button-primary button-large" type="submit" disabled={loading}>{loading ? 'Connexion...' : 'Se connecter'}</button>
        </form>
    </AuthLayout>
  );
}
