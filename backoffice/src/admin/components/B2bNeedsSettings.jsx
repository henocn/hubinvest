import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../lib/api';
import { useRealtimeEvent } from '../../lib/realtime';
import B2bNeedDrawer from './drawers/B2bNeedDrawer';
import { useRowSelection } from './RowSelection';
import B2bNeedsTable from './tables/B2bNeedsTable';

// Besoins B2B publiés sur le site : créés et modifiés ici ; les demandes reçues se traitent dans Rencontres.
// Un administrateur de stand ne voit et ne crée que les besoins de son stand.
export default function B2bNeedsSettings({ session, onLogout }) {
  const isSuperAdmin = session.user.role === 'super-admin';
  const [needs, setNeeds] = useState(null);
  const [occupants, setOccupants] = useState([]);
  const [error, setError] = useState('');
  const [drawer, setDrawer] = useState(null);
  const selection = useRowSelection(needs || []);

  const load = useCallback(async () => {
    try {
      const [needData, occupantData] = await Promise.all([
        api.b2bNeeds(session.token),
        isSuperAdmin ? api.occupants(session.token) : Promise.resolve([]),
      ]);
      setNeeds(needData);
      setOccupants(occupantData);
    } catch (requestError) {
      if (requestError.status === 401 || requestError.status === 403) onLogout();
      else setError(requestError.message);
    }
  }, [isSuperAdmin, onLogout, session.token]);

  useEffect(() => { void load(); }, [load]);
  useRealtimeEvent('b2b', () => { void load(); });

  const saved = async () => {
    setDrawer(null);
    await load();
  };

  return (
    <section className="data-panel settings-panel">
      <header className="settings-panel-head">
        <h2>Besoins B2B {needs && <span>{needs.length}</span>}</h2>
        <button className="button button-primary" type="button" onClick={() => setDrawer({ item: null })}><Plus size={16} /> Besoin</button>
      </header>
      {error && <p className="panel-message is-error">{error}</p>}
      {!needs && !error && <p className="panel-message">Chargement…</p>}
      {needs && <B2bNeedsTable selection={selection} needs={needs} showStand={isSuperAdmin} onEdit={(item) => setDrawer({ item })} />}
      {drawer && <B2bNeedDrawer need={drawer.item} occupants={occupants} fixedOccupant={isSuperAdmin ? null : session.user.occupant} token={session.token} onClose={() => setDrawer(null)} onSaved={saved} />}
    </section>
  );
}
