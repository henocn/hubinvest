import { CheckCircle2, ScanLine } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import ChallengeScannerDialog from '../components/occupant/ChallengeScannerDialog';
import { api } from '../lib/api';
import { useRealtimeConnected, useRealtimeEvent } from '../lib/realtime';

const participantCode = /^[A-HJ-NP-Z2-9]{8}$/;

export default function OccupantChallengePage({ session, onLogout }) {
  const validatingRef = useRef(false);
  const [scannedPlayers, setScannedPlayers] = useState(null);
  const [statsError, setStatsError] = useState('');
  const [code, setCode] = useState('');
  const [pendingCode, setPendingCode] = useState('');
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const refreshStats = useCallback(async () => {
    try {
      const stats = await api.challengePassageStats(session.token);
      setScannedPlayers(stats.scannedPlayers);
      setStatsError('');
    } catch (requestError) {
      if (requestError.status === 401 || requestError.status === 403) onLogout();
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

  const prepareClassification = useCallback((value) => {
    const normalized = value.trim().toUpperCase();
    if (!participantCode.test(normalized)) {
      setError('Saisissez les 8 caractères du code participant.');
      setPendingCode('');
      setResult(null);
      return false;
    }

    setError('');
    setResult(null);
    setPendingCode(normalized);
    return true;
  }, []);

  const validateCode = useCallback(async (classification) => {
    if (validatingRef.current) return;

    validatingRef.current = true;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const passage = await api.validateChallengePassage(session.token, pendingCode, classification);
      setResult(passage);
      setCode('');
      setPendingCode('');
      setScannedPlayers((current) => current === null ? current : current + 1);
      void refreshStats();
    } catch (requestError) {
      if (requestError.status === 401 || requestError.status === 403) onLogout();
      else setError(requestError.message);
    } finally {
      validatingRef.current = false;
      setLoading(false);
    }
  }, [onLogout, pendingCode, refreshStats, session.token]);

  const scanned = useCallback((value) => {
    setOpen(false);
    prepareClassification(value);
  }, [prepareClassification]);

  const submit = (event) => {
    event.preventDefault();
    prepareClassification(code);
  };

  return (
    <main className="workspace challenge-validation-workspace">
      <section className="challenge-validation-content">
        <h1>{scannedPlayers === null ? 'Joueurs scannés' : `Vous avez scanné ${scannedPlayers} joueur${scannedPlayers === 1 ? '' : 's'}`}</h1>
        {statsError && <p className="panel-error" role="alert">{statsError}</p>}
        <button className="button button-primary challenge-open-scanner" type="button" onClick={() => setOpen(true)} disabled={loading}><ScanLine size={20} /> Scanner</button>
        <form className="challenge-manual-form" onSubmit={submit}>
          <label htmlFor="challenge-participant-code">Code participant</label>
          <div className="challenge-manual-row">
            <input id="challenge-participant-code" className="challenge-code-input" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} minLength={8} maxLength={8} autoCapitalize="characters" autoComplete="off" required />
            <button className="button button-secondary" type="submit" disabled={loading}>OK</button>
          </div>
        </form>
        {error && <p className="panel-error" role="alert">{error}</p>}
        {pendingCode && <div className="challenge-classification" role="group" aria-label="Classer le participant"><strong>Classer le participant</strong><div>{['A', 'B', 'C'].map((classification) => <button className="challenge-classification-button" type="button" key={classification} onClick={() => { void validateCode(classification); }} disabled={loading} aria-label={`Classer le participant en ${classification}`}>{classification}</button>)}</div></div>}
        {result && <p className="challenge-validation-success" role="status"><CheckCircle2 size={20} /> Passage validé pour {result.displayName} · Classement {result.classification}</p>}
      </section>
      {open && <ChallengeScannerDialog onCode={scanned} onClose={() => setOpen(false)} />}
    </main>
  );
}
