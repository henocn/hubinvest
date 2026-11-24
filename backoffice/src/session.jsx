import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { homeForRole } from './navigation';

const STORAGE_KEY = 'hubinvest-session';
const SessionContext = createContext(null);

const readStoredSession = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (parsed && homeForRole(parsed.user?.role)) return parsed;
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Session illisible : on repart de la connexion.
  }
  return null;
};

// Session de l'équipe : jeton, profil à jour et déconnexion, partagés par toutes les pages.
export function SessionProvider({ children }) {
  const [session, setSession] = useState(readStoredSession);

  const signIn = useCallback((result) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    setSession(result);
  }, []);

  const updateUser = useCallback((user) => {
    setSession((current) => {
      if (!current) return current;
      const next = { ...current, user };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Session renouvelée : nouveau jeton, même compte.
  const updateToken = useCallback((token) => {
    setSession((current) => {
      if (!current || !token) return current;
      const next = { ...current, token };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Un rechargement complet repart d'un état propre (flux temps réel, caches des pages).
  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.assign('/connexion');
  }, []);

  const value = useMemo(() => ({ session, signIn, updateUser, updateToken, logout }), [session, signIn, updateUser, updateToken, logout]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);
