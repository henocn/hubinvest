import { CheckCircle2, ListChecks, ScanLine } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import ChallengeScannerDialog from '../components/ChallengeScannerDialog';
import PlayerSearch from '../components/PlayerSearch';
import ScanListDialog from '../components/ScanListDialog';
import { useWheelPrize, WheelPrizeCard, WheelPrizeResult, wheelCodePattern } from '../components/WheelPrize';
import { api } from '../lib/api';
import { useRealtimeConnected, useRealtimeEvent } from '../lib/realtime';
import { accessRole, isApizfTeamRole } from '../navigation';

const participantCode = /^(?:[A-HJ-NP-Z2-9]{6}|[A-HJ-NP-Z2-9]{8})$/;

export default function OccupantChallengePage({ session, onLogout }) {
  const validatingRef = useRef(false);
  const [scannedPlayers, setScannedPlayers] = useState(null);
  const [statsError, setStatsError] = useState('');
  const [code, setCode] = useState('');
  const [open, setOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  // Lots de la roue : remis seulement par le Stand API-ZF ; les autres stands ne saisissent que des codes participants.
  const handlesWheel = isApizfTeamRole(accessRole(session.user));
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const wheel = useWheelPrize({ session, onLogout });

  const refreshStats = useCallback(async () => {
    try {
      const stats = await api.challengePassageStats(session.token);
      setScannedPlayers(stats.scannedPlayers);
      setStatsError('');
    } catch (requestError) {
      if (requestError.status === 401) onLogout();
      else setStatsError('Impossible de charger le nombre de joueurs scannés.');
    }
  }, [onLogout, session.token]);

  const realtimeConnected = useRealtimeConnected();
  useRealtimeEvent('challenge', () => { void refreshStats(); });

  useEffect(() => {
    void refreshStats();
    const onFocus = () => { void refreshStats(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshStats]);

  // Rafraîchissement de secours seulement quand le flux en temps réel est coupé.
  useEffect(() => {
    if (realtimeConnected) return undefined;
    const interval = window.setInterval(() => { if (!document.hidden) void refreshStats(); }, 30000);
    return () => window.clearInterval(interval);
  }, [realtimeConnected, refreshStats]);

  // Un code participant valide aussitôt le passage du joueur sur ce stand, sans autre étape.
  const validateCode = useCallback(async (participant) => {
    if (validatingRef.current) return;

    validatingRef.current = true;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const passage = await api.validateChallengePassage(session.token, participant);
      setResult(passage);
      setCode('');
      setScannedPlayers((current) => current === null ? current : current + 1);
      void refreshStats();
    } catch (requestError) {
      if (requestError.status === 401) onLogout();
      else setError(requestError.message);
    } finally {
      validatingRef.current = false;
      setLoading(false);
    }
  }, [onLogout, refreshStats, session.token]);

  // Code de 4 caractères : code de jeu de la roue, on retrouve le lot gagné pour le remettre.
  // Code de 6 (ou 8) caractères : code participant, le passage est validé.
  const handleCode = useCallback((value) => {
    const normalized = value.trim().toUpperCase().replace(/[\s-]/g, '');
    if (handlesWheel && wheelCodePattern.test(normalized)) {
      setError('');
      setResult(null);
      setCode('');
      void wheel.findPrize(normalized);
      return;
    }
    wheel.resetPrize();
    if (!participantCode.test(normalized)) {
      setError(handlesWheel ? 'Saisissez le code participant (6 caractères) ou le code de jeu de la roue (4 caractères).' : 'Saisissez le code participant (6 caractères).');
      setResult(null);
      return;
    }
    void validateCode(normalized);
  }, [handlesWheel, validateCode, wheel]);

  const scanned = useCallback((value) => {
    setOpen(false);
    handleCode(value);
  }, [handleCode]);

  const closeList = useCallback(() => setListOpen(false), []);

  const submit = (event) => {
    event.preventDefault();
    handleCode(code);
  };

  return (
    <main className="workspace challenge-validation-workspace">
      <section className="challenge-validation-content">
        <h1>{scannedPlayers === null ? 'Joueurs scannés' : `Vous avez scanné ${scannedPlayers} joueur${scannedPlayers === 1 ? '' : 's'}`}</h1>
        {statsError && <p className="panel-error" role="alert">{statsError}</p>}
        <button className="button button-primary challenge-open-scanner" type="button" onClick={() => setOpen(true)} disabled={loading}><ScanLine size={20} /> Scanner</button>
        <form className="challenge-manual-form" onSubmit={submit}>
          <label htmlFor="challenge-participant-code">{handlesWheel ? 'Code participant ou code de jeu' : 'Code participant'}</label>
          <div className="challenge-manual-row">
            <input id="challenge-participant-code" className="challenge-code-input" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} minLength={handlesWheel ? 4 : 6} maxLength={8} autoCapitalize="characters" autoComplete="off" required />
            <button className="button button-secondary" type="submit" disabled={loading}>OK</button>
          </div>
        </form>
        <PlayerSearch session={session} onLogout={onLogout} onPick={handleCode} />
        {error && <p className="panel-error" role="alert">{error}</p>}
        {result && <p className="challenge-validation-success" role="status"><CheckCircle2 size={20} /> Passage validé pour {result.displayName}</p>}
        <WheelPrizeCard prize={wheel.prize} loading={wheel.prizeLoading} onClaim={wheel.claimPrize} />
        {wheel.prizeError && <p className="panel-error" role="alert">{wheel.prizeError}</p>}
        <WheelPrizeResult text={wheel.claimed} />
        <div className="scan-list-open"><button className="button button-secondary" type="button" onClick={() => setListOpen(true)}><ListChecks size={18} /> Liste des scans</button></div>
      </section>
      {open && <ChallengeScannerDialog onCode={scanned} onClose={() => setOpen(false)} />}
      {listOpen && <ScanListDialog session={session} onLogout={onLogout} onClose={closeList} />}
    </main>
  );
}
