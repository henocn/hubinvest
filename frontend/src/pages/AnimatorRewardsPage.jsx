import { Gift } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useRealtimeEvent } from '../lib/realtime';
import PlayerContact from '../components/PlayerContact';

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
      if (requestError.status === 401 || requestError.status === 403) onLogout();
      else setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [onLogout, session.token]);

  useEffect(() => { void load(); }, [load]);

  // Chaque remise, faite ici ou par un autre animateur, s'ajoute sans actualiser.
  useRealtimeEvent('challenge', () => { void load(); });

  return (
    <main className="workspace animator-rewards-workspace">
      <h1>Récompenses remises</h1>
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
