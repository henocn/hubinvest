import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './lib/api';
import { useRealtimeEvent } from '../lib/realtime';

const DashboardContext = createContext(null);

// Chiffres du tableau de bord, partagés avec le menu (pastilles « à traiter ») et rafraîchis en temps réel.
export function DashboardProvider({ session, onLogout, children }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      setData(await api.dashboard(session.token));
      setError('');
    } catch (requestError) {
      if (requestError.status === 401 || requestError.status === 403) onLogout();
      else setError(requestError.message);
    }
  }, [onLogout, session.token]);

  useEffect(() => { void refresh(); }, [refresh]);
  useRealtimeEvent(['investor-requests', 'b2b', 'studio', 'challenge', 'wheel', 'occupants', 'contacts'], () => { void refresh(); });

  return <DashboardContext.Provider value={{ data, error, refresh }}>{children}</DashboardContext.Provider>;
}

export const useDashboard = () => useContext(DashboardContext);
