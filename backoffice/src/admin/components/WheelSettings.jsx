import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../lib/api';
import { useRealtimeEvent } from '../../lib/realtime';
import ConfirmDelete from './ConfirmDelete';
import WheelSegmentDrawer from './drawers/WheelSegmentDrawer';
import { useRowSelection } from './RowSelection';
import WheelSegmentsTable from './tables/WheelSegmentsTable';

// Réglages de la roue des opportunités : les cases (lots avec leur stock, cases perdantes) se créent et se modifient ici ;
// l'historique des parties se consulte dans Jeux. « children » accueille les autres réglages de la roue (parties par jour).
export default function WheelSettings({ session, onLogout, children }) {
  const [segments, setSegments] = useState(null);
  const [error, setError] = useState('');
  const [drawer, setDrawer] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const selection = useRowSelection(segments || []);

  const load = useCallback(async () => {
    try {
      setSegments((await api.wheel(session.token)).segments);
    } catch (requestError) {
      if (requestError.status === 401) onLogout();
      else setError(requestError.message);
    }
  }, [onLogout, session.token]);

  useEffect(() => { void load(); }, [load]);
  useRealtimeEvent('wheel', () => { void load(); });

  const saved = async () => {
    setDrawer(null);
    await load();
  };

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await api.deleteWheelSegment(session.token, pendingDelete.id);
      setPendingDelete(null);
      await load();
    } catch (requestError) {
      setDeleteError(requestError.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="data-panel settings-panel">
      <header className="settings-panel-head">
        <h2>Roue des opportunités {segments && <span>{segments.length}</span>}</h2>
        <button className="button button-primary" type="button" onClick={() => setDrawer({ item: null })}><Plus size={16} /> Case</button>
      </header>
      {children}
      {error && <p className="panel-message is-error">{error}</p>}
      {!segments && !error && <p className="panel-message">Chargement…</p>}
      {segments && <WheelSegmentsTable selection={selection} segments={segments} onEdit={(item) => setDrawer({ item })} onDelete={(item) => { setDeleteError(''); setPendingDelete(item); }} />}
      {drawer && <WheelSegmentDrawer segment={drawer.item} token={session.token} onClose={() => setDrawer(null)} onSaved={saved} />}
      {pendingDelete && <ConfirmDelete subject={{ label: `la case « ${pendingDelete.label} » de la roue` }} loading={deleting} error={deleteError} onCancel={() => setPendingDelete(null)} onConfirm={confirmDelete} />}
    </section>
  );
}
