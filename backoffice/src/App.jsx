import { useCallback, useState } from 'react';
import { backofficeRoles } from './constants/access';
import { api } from './lib/api';
import BackofficePage from './pages/BackofficePage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';

export default function App() {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const [session, setSession] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('hubinvest-admin-session'));
      if (!backofficeRoles.has(stored?.user?.role)) {
        localStorage.removeItem('hubinvest-admin-session');
        return null;
      }
      return stored;
    } catch {
      return null;
    }
  });

  const login = async (values) => {
    const nextSession = await api.login(values);
    if (!backofficeRoles.has(nextSession.user.role)) {
      throw new Error("Ce compte n’a pas accès à l’administration.");
    }
    localStorage.setItem('hubinvest-admin-session', JSON.stringify(nextSession));
    setSession(nextSession);
  };

  const logout = useCallback(() => {
    localStorage.removeItem('hubinvest-admin-session');
    setSession(null);
  }, []);

  if (path === '/mot-de-passe-oublie') return <ForgotPasswordPage />;

  if (!session) return <LoginPage onLogin={login} />;
  return <BackofficePage session={session} onLogout={logout} />;
}
