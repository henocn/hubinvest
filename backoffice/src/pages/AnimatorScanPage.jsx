import { CheckCircle2, ScanLine } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import ChallengeScannerDialog from '../components/ChallengeScannerDialog';
import PlayerSearch from '../components/PlayerSearch';
import { useWheelPrize, WheelPrizeCard, WheelPrizeResult, wheelCodePattern } from '../components/WheelPrize';
import { api } from '../lib/api';
import { useRealtimeEvent } from '../lib/realtime';

const participantCode = /^(?:[A-HJ-NP-Z2-9]{6}|[A-HJ-NP-Z2-9]{8})$/;

export default function AnimatorScanPage({ session, onLogout }) {
  const submitting = useRef(false);
  const [code, setCode] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [participant, setParticipant] = useState(null);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const wheel = useWheelPrize({ session, onLogout });

  const findParticipant = useCallback(async (value) => {
    if (submitting.current) return;
    const normalized = value.trim().toUpperCase().replace(/[\s-]/g, '');
    // Un code de 4 caractères est un code de jeu de la roue : on retrouve le lot gagné.
    if (wheelCodePattern.test(normalized)) {
      setError('');
      setParticipant(null);
      setResult('');
      setCode('');
      await wheel.findPrize(normalized);
      return;
    }
    wheel.resetPrize();
    if (!participantCode.test(normalized)) {
      setError('Saisissez le code participant (6 caractères) ou le code de jeu de la roue (4 caractères).');
      setParticipant(null);
      setResult('');
      return;
    }

    submitting.current = true;
    setLoading(true);
    setError('');
    setParticipant(null);
    setResult('');
    try {
      setParticipant(await api.challengeRewardByCode(session.token, normalized));
      setCode('');
    } catch (requestError) {
      if (requestError.status === 401) onLogout();
      // Anciens codes de jeu de 6 caractères : inconnus comme participant, on cherche un lot de la roue.
      else if (requestError.status === 404) {
        setCode('');
        await wheel.findPrize(normalized);
      } else setError(requestError.message);
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }, [onLogout, session.token, wheel]);

  // Le participant affiché suit ses passages, ou une remise faite par un autre animateur.
  useRealtimeEvent('challenge', () => {
    if (!participant?.code || submitting.current) return;
    const shownCode = participant.code;
    api.challengeRewardByCode(session.token, shownCode)
      .then((updated) => setParticipant((current) => (current?.code === shownCode ? updated : current)))
      .catch((requestError) => {
        if (requestError.status === 401) onLogout();
      });
  });

  const redeem = async () => {
    if (!participant || participant.status !== 'completed') return;
    setLoading(true);
    setError('');
    try {
      const passport = await api.redeemChallengeReward(session.token, participant.code);
      setParticipant(null);
      setResult(`Récompense remise à ${passport.displayName}`);
    } catch (requestError) {
      if (requestError.status === 401) onLogout();
      else setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const scanned = useCallback((value) => {
    setCameraOpen(false);
    void findParticipant(value);
  }, [findParticipant]);

  return (
    <main className="workspace challenge-validation-workspace animator-scan-workspace">
      <section className="challenge-validation-content">
        <h1>Remettre une récompense ou un lot</h1>
        <button className="button button-primary challenge-open-scanner" type="button" onClick={() => setCameraOpen(true)} disabled={loading}><ScanLine size={20} /> Scanner</button>
        <form className="challenge-manual-form" onSubmit={(event) => { event.preventDefault(); void findParticipant(code); }}>
          <label htmlFor="reward-participant-code">Code participant ou code de jeu</label>
          <div className="challenge-manual-row"><input id="reward-participant-code" className="challenge-code-input" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} minLength={4} maxLength={8} autoCapitalize="characters" autoComplete="off" required /><button className="button button-secondary" type="submit" disabled={loading}>OK</button></div>
        </form>
        <PlayerSearch session={session} onLogout={onLogout} onPick={(value) => { void findParticipant(value); }} />
        {participant && <section className={`animator-participant is-${participant.status}`}><strong>{participant.displayName}</strong><span>{participant.passageCount} / {participant.requiredPassages} étapes</span>{participant.status === 'completed' && <button className="button button-primary" type="button" onClick={redeem} disabled={loading}>Remettre la récompense</button>}{participant.status === 'active' && <p>Parcours non terminé.</p>}{participant.status === 'redeemed' && <p>Récompense déjà remise.</p>}</section>}
        <WheelPrizeCard prize={wheel.prize} loading={wheel.prizeLoading} onClaim={wheel.claimPrize} />
        {wheel.prizeError && <p className="panel-error" role="alert">{wheel.prizeError}</p>}
        <WheelPrizeResult text={wheel.claimed} />
        {error && <p className="panel-error" role="alert">{error}</p>}
        {result && <p className="challenge-validation-success" role="status"><CheckCircle2 size={20} /> {result}</p>}
      </section>
      {cameraOpen && <ChallengeScannerDialog onCode={scanned} onClose={() => setCameraOpen(false)} />}
    </main>
  );
}
