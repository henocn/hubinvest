import { useCallback, useEffect, useState } from 'react';
import { Pencil, QrCode } from 'lucide-react';
import { StandSheet, standPublicUrl } from '../components/OccupantDetail';
import OccupantDrawer from '../components/drawers/OccupantDrawer';
import QrCodeDialog from '../components/QrCodeDialog';
import { api } from '../lib/api';
import { useRealtimeEvent } from '../../lib/realtime';

// « Mon stand » : l'occupant arrive directement sur la fiche de son stand (jamais la liste des stands) et la modifie.
export default function MyStandPage({ session, onLogout }) {
  const occupantId = session.user.occupant?.id;
  const [occupant, setOccupant] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [qrCode, setQrCode] = useState(null);

  const load = useCallback(async () => {
    if (!occupantId) return;
    try {
      setOccupant(await api.occupant(session.token, occupantId));
    } catch (requestError) {
      if (requestError.status === 401 || requestError.status === 403) onLogout();
      else setError(requestError.message);
    }
  }, [occupantId, onLogout, session.token]);

  useEffect(() => { load(); }, [load]);
  useRealtimeEvent('occupants', load);

  if (!occupantId) return <main className="admin-workspace"><p className="panel-message">Aucun stand n’est rattaché à ce compte.</p></main>;
  if (error) return <main className="admin-workspace"><p className="panel-message is-error">{error}</p></main>;
  if (!occupant) return <main className="admin-workspace"><p className="panel-message">Chargement…</p></main>;

  const isActive = occupant.status === 'active';

  return (
    <main className="admin-workspace">
      <header className="workspace-header">
        <div className="stand-title">
          <h1>{occupant.name}</h1>
          <span className={`status-pill${isActive ? ' is-active' : ''}`}>{isActive ? 'Actif' : 'Inactif'}</span>
        </div>
        <div className="workspace-actions">
          {isActive && <button className="button button-secondary" type="button" onClick={() => setQrCode({ title: occupant.name, url: standPublicUrl(occupant), fileName: `hubinvest-${occupant.slug}` })}><QrCode size={16} /> QR</button>}
          <button className="button button-primary" type="button" onClick={() => setEditing(true)}><Pencil size={16} /> Modifier</button>
        </div>
      </header>

      <StandSheet occupant={occupant} />

      {editing && <OccupantDrawer own occupant={occupant} token={session.token} onClose={() => setEditing(false)} onSaved={(saved) => { setOccupant(saved); setEditing(false); }} />}
      {qrCode && <QrCodeDialog {...qrCode} onClose={() => setQrCode(null)} />}
    </main>
  );
}
