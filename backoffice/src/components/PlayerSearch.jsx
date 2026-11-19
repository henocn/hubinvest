import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '../lib/api';
import { displayPhone } from '../lib/phone';

const statusLabels = { active: 'En cours', completed: 'Terminé', redeemed: 'Récompensé' };

// Code perdu ou téléphone changé : on retrouve le joueur par son nom, son e-mail ou son téléphone, puis on reprend avec son code.
export default function PlayerSearch({ session, onLogout, onPick }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [players, setPlayers] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) {
      setPlayers([]);
      setError('');
      return undefined;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      setSearching(true);
      api.searchPlayers(session.token, value)
        .then((data) => { if (active) { setPlayers(data); setError(''); } })
        .catch((requestError) => {
          if (!active) return;
          if (requestError.status === 401 || requestError.status === 403) onLogout();
          else setError(requestError.message);
        })
        .finally(() => { if (active) setSearching(false); });
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [onLogout, query, session.token]);

  const pick = (code) => {
    setOpen(false);
    setQuery('');
    setPlayers([]);
    onPick(code);
  };

  if (!open) {
    return <button className="player-search-toggle" type="button" onClick={() => setOpen(true)}>Code perdu ? Retrouver le joueur</button>;
  }

  return (
    <section className="player-search">
      <label className="search-field">
        <Search size={18} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nom, téléphone ou e-mail"
          aria-label="Rechercher un joueur"
          autoComplete="off"
          autoFocus
        />
      </label>
      {error && <p className="panel-error" role="alert">{error}</p>}
      {!searching && query.trim().length >= 2 && !players.length && !error && <p className="player-search-empty">Aucun joueur trouvé.</p>}
      {players.length > 0 && (
        <ul className="player-search-results">
          {players.map((player) => (
            <li key={player.code}>
              <button type="button" onClick={() => pick(player.code)}>
                <strong>{player.displayName}</strong>
                <span>{[player.phone && displayPhone(player.phone), player.email].filter(Boolean).join(' · ') || '—'}</span>
                <small>{player.code} · {statusLabels[player.status] || player.status}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
