import { useCallback, useEffect, useState } from 'react';
import { Pencil, QrCode } from 'lucide-react';
import { StandSheet, standPublicUrl } from '../components/OccupantDetail';
import OccupantDrawer from '../components/drawers/OccupantDrawer';
import QrCodeDialog from '../components/QrCodeDialog';
import B2bNeedsSettings from '../components/B2bNeedsSettings';
import { api } from '../lib/api';
import { useRealtimeEvent } from '../../lib/realtime';

// « Mon stand » : l'occupant arrive directement sur son stand (jamais la liste des stands), en onglets : ses besoins B2B
// publiés sur le site (le plus sollicité, ouvert d'abord), puis la fiche du stand, qu'il modifie.
export default function MyStandPage({ session, onLogout }) {
  const occupantId = session.user.occupant?.id;
  const [occupant, setOccupant] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [tab, setTab] = useState('needs');

  const load = useCallback(async () => {
    if (!occupantId) return;
    try {
      setOccupant(await api.occupant(session.token, occupantId));
    } catch (requestError) {
      if (requestError.status === 401) onLogout();
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

      <nav className="section-tabs detail-tabs" aria-label="Mon stand">
        <button type="button" className={tab === 'needs' ? 'is-active' : ''} onClick={() => setTab('needs')} aria-pressed={tab === 'needs'}>Besoins B2B</button>
        <button type="button" className={tab === 'details' ? 'is-active' : ''} onClick={() => setTab('details')} aria-pressed={tab === 'details'}>Fiche</button>
      </nav>

      {tab === 'needs' && <B2bNeedsSettings session={session} onLogout={onLogout} />}
      {tab === 'details' && <StandSheet occupant={occupant} />}

      {editing && <OccupantDrawer own occupant={occupant} token={session.token} onClose={() => setEditing(false)} onSaved={(saved) => { setOccupant(saved); setEditing(false); }} />}
      {qrCode && <QrCodeDialog {...qrCode} onClose={() => setQrCode(null)} />}
    </main>
  );
}
