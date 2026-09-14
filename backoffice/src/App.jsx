import { useCallback, useState } from 'react';
import { backofficeRoles } from './constants/access';
import { api } from './lib/api';
import BackofficePage from './pages/BackofficePage';
import LoginPage from './pages/LoginPage';

export default function App() {
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('hubinvest-admin-session'));
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

  if (!session) return <LoginPage onLogin={login} />;
  return <BackofficePage session={session} onLogout={logout} />;
}
