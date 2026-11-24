import { Download, Gift } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useRealtimeEvent } from '../lib/realtime';
import PlayerContact from '../components/PlayerContact';
import { exportToExcel, formatDate } from '../lib/excel';

const formatRedeemedAt = (value) => (value
  ? new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—');

// Liste des récompenses déjà remises ; les remises faites par l'animateur connecté sont légèrement surlignées.
export default function AnimatorRewardsPage({ session, onLogout }) {
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setRewards(await api.challengeRewards(session.token));
      setError('');
    } catch (requestError) {
      if (requestError.status === 401) onLogout();
      else setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [onLogout, session.token]);

  useEffect(() => { void load(); }, [load]);

  // Chaque remise, faite ici ou par un autre animateur, s'ajoute sans actualiser.
  useRealtimeEvent('challenge', () => { void load(); });


  const exportRewards = () => exportToExcel({
    name: 'remises',
    sheetName: 'Remises',
    rows: rewards,
    columns: [
      { header: 'Remise le', value: (item) => formatDate(item.redeemedAt), width: 18 },
      { header: 'Participant', value: (item) => item.displayName, width: 28 },
      { header: 'E-mail', value: (item) => item.email, width: 30 },
      { header: 'Téléphone', value: (item) => item.phone || item.contact, width: 18 },
      { header: 'Remise par moi', value: (item) => Boolean(item.redeemedByMe), width: 15 },
    ],
  });

  return (
    <main className="workspace animator-rewards-workspace">
      <div className="rewards-heading">
        <h1>Récompenses remises</h1>
        {rewards.length > 0 && (
          <button className="button button-secondary button-compact" type="button" onClick={exportRewards}>
            <Download size={17} />
            Excel
          </button>
        )}
      </div>
      {loading && <p className="empty-state">Chargement des remises…</p>}
      {!loading && error && <p className="panel-error" role="alert">{error}</p>}
      {!loading && !error && rewards.length === 0 && (
        <div className="empty-state">
          <Gift size={28} />
          <strong>Aucune récompense remise</strong>
        </div>
      )}
      {!loading && !error && rewards.length > 0 && (
        <div className="rewards-table-frame">
          <table className="rewards-table">
            <thead>
              <tr>
                <th scope="col">Participant</th>
                <th scope="col">Contact</th>
                <th scope="col">Remise le</th>
              </tr>
            </thead>
            <tbody>
              {rewards.map((reward) => (
                <tr key={reward.id} className={reward.redeemedByMe ? 'is-mine' : undefined}>
                  <td>{reward.displayName}</td>
                  <td><PlayerContact player={reward} /></td>
                  <td>{formatRedeemedAt(reward.redeemedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
