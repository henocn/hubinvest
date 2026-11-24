import { useCallback, useState } from 'react';
import { CheckCircle2, Gift } from 'lucide-react';
import { api } from '../lib/api';

// Code de jeu de la roue : 4 caractères. Code participant des Défis : 6 (ou 8 pour les anciens).
export const wheelCodePattern = /^[A-HJ-NP-Z2-9]{4}$/;

const timeFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', hour: '2-digit', minute: '2-digit' });
const fullName = (person) => (person ? [person.firstName, person.lastName].filter(Boolean).join(' ') : '');

// Retrouve un lot gagné à partir de son code, puis le marque comme remis (une seule fois).
export function useWheelPrize({ session, onLogout }) {
  const [prize, setPrize] = useState(null);
  const [prizeError, setPrizeError] = useState('');
  const [prizeLoading, setPrizeLoading] = useState(false);
  const [claimed, setClaimed] = useState('');

  const handle = useCallback((requestError) => {
    if (requestError.status === 401) onLogout();
    else if (requestError.code === 'WHEEL_PRIZE_ALREADY_CLAIMED' && requestError.details) setPrize(requestError.details);
    else setPrizeError(requestError.message);
  }, [onLogout]);

  const findPrize = useCallback(async (code) => {
    setPrizeLoading(true);
    setPrizeError('');
    setClaimed('');
    setPrize(null);
    try {
      setPrize(await api.wheelPrize(session.token, code));
    } catch (requestError) {
      handle(requestError);
    } finally {
      setPrizeLoading(false);
    }
  }, [handle, session.token]);

  const claimPrize = useCallback(async () => {
    if (!prize) return;
    setPrizeLoading(true);
    setPrizeError('');
    try {
      const done = await api.claimWheelPrize(session.token, prize.code);
      setPrize(null);
      setClaimed(`${done.result.label} remis à ${done.player?.displayName || 'ce joueur'}`);
    } catch (requestError) {
      handle(requestError);
    } finally {
      setPrizeLoading(false);
    }
  }, [handle, prize, session.token]);

  const resetPrize = useCallback(() => {
    setPrize(null);
    setPrizeError('');
    setClaimed('');
  }, []);

  return { prize, prizeError, prizeLoading, claimed, findPrize, claimPrize, resetPrize };
}

// Fiche du lot retrouvé : ce qu'il faut remettre et à qui, ou l'indication qu'il a déjà été remis.
export function WheelPrizeCard({ prize, loading, onClaim }) {
  if (!prize) return null;
  const done = Boolean(prize.claimedAt);
  return (
    <section className={`animator-participant wheel-prize-card${done ? ' is-redeemed' : ' is-completed'}`}>
      <span className="wheel-prize-kicker"><Gift size={16} /> Lot de la roue · {prize.code}</span>
      <strong>{prize.result.label}</strong>
      <span>Gagné par {prize.player?.displayName || 'un joueur'}</span>
      {done
        ? <p>Déjà remis à {timeFormatter.format(new Date(prize.claimedAt))}{prize.claimedBy ? ` par ${fullName(prize.claimedBy)}` : ''}.</p>
        : <button className="button button-primary" type="button" onClick={onClaim} disabled={loading}>Remettre le lot</button>}
    </section>
  );
}

export function WheelPrizeResult({ text }) {
  return text ? <p className="challenge-validation-success" role="status"><CheckCircle2 size={20} /> {text}</p> : null;
}
