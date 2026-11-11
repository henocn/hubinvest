import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PlayCta from '../components/PlayCta';
import PlayerIdentifyDialog from '../components/PlayerIdentifyDialog';
import WheelOfFortune from '../components/WheelOfFortune';
import { api } from '../lib/api';
import { clearChallengePassportToken, readChallengePassportToken, saveChallengePassportToken } from '../lib/challenge-passport-store';
import { publicErrorMessage } from '../lib/public-error';

const FULL_TURNS = 6;

// Calcule l'angle final qui amène le centre de la case gagnante sous le repère, après plusieurs tours.
const targetRotation = (current, index, count) => {
  const slice = 360 / count;
  const center = (index + 0.5) * slice;
  const jitter = (Math.random() - 0.5) * slice * 0.6;
  const aligned = (((-center - current) % 360) + 360) % 360;
  return current + FULL_TURNS * 360 + aligned + jitter;
};

export default function WheelPage() {
  const { t, i18n } = useTranslation();
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [outcome, setOutcome] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [player, setPlayer] = useState(() => readChallengePassportToken());
  const [identifying, setIdentifying] = useState(false);
  const pendingOutcome = useRef(null);
  const resultRef = useRef(null);

  useEffect(() => {
    if (revealed) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [revealed]);

  useEffect(() => {
    let active = true;
    api.publicWheel()
      .then((data) => { if (active && !pendingOutcome.current) setSegments(data.segments); })
      .catch((requestError) => { if (active) setError(publicErrorMessage(t, requestError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [i18n.resolvedLanguage, t]);

  const reveal = () => {
    if (!pendingOutcome.current) return;
    setSpinning(false);
    setOutcome(pendingOutcome.current);
    setRevealed(true);
  };

  const spin = async (event) => {
    event.preventDefault();
    if (spinning) return;
    setError('');
    setSpinning(true);
    try {
      const data = await api.spinWheel(code, player);
      const index = data.segments.findIndex((segment) => segment.id === data.result.id);
      pendingOutcome.current = data;
      setSegments(data.segments);
      window.requestAnimationFrame(() => setRotation((current) => targetRotation(current, Math.max(index, 0), data.segments.length)));
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) window.setTimeout(reveal, 700);
    } catch (requestError) {
      setSpinning(false);
      if (requestError.code === 'WHEEL_PLAYER_REQUIRED') {
        clearChallengePassportToken();
        setPlayer('');
      }
      setError(publicErrorMessage(t, requestError));
    }
  };

  const identified = (data) => {
    saveChallengePassportToken(data.token);
    setPlayer(data.token);
    setIdentifying(false);
    setError('');
  };

  const playAgain = () => {
    pendingOutcome.current = null;
    setOutcome(null);
    setRevealed(false);
    setCode('');
  };

  const won = outcome?.result.kind === 'prize';

  return (
    <main className="public-container wheel-page">
      <section className="wheel-panel">
        <span className="public-eyebrow">{t('challenge.eyebrow')}</span>
        <h1>{t('wheel.title')}</h1>
        {loading && <p className="public-message">{t('wheel.loading')}</p>}
        {!loading && !segments.length && !error && <p className="public-message">{t('wheel.notReady')}</p>}
        {segments.length > 0 && <WheelOfFortune segments={segments} rotation={rotation} spinning={spinning} onSpinEnd={reveal} />}

        {!player && !loading && <p className="wheel-locked">{t('play.wheelLocked')}</p>}
        {!player && error && <p className="form-error">{error}</p>}

        {!player ? null : revealed && outcome ? (
          <div ref={resultRef} className={`wheel-result${won ? ' is-won' : ''}`} role="status">
            {won && <span>{t('wheel.won')}</span>}
            <strong>{outcome.result.label}</strong>
            {won && outcome.result.sponsor && <small>{t('wheel.sponsor', { sponsor: outcome.result.sponsor })}</small>}
            <p>{won ? t('wheel.claim') : t('wheel.lost')}</p>
            {won && <code>{outcome.code}</code>}
            <button className="button button-secondary" type="button" onClick={playAgain}>{t('wheel.playAgain')}</button>
          </div>
        ) : (
          <form className="wheel-form" onSubmit={spin}>
            <label>
              {t('wheel.code')}
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck="false"
                maxLength={8}
                required
                disabled={spinning}
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="button button-primary button-large" type="submit" disabled={spinning || !segments.length || code.trim().length < 4}>
              {spinning ? t('wheel.spinning') : t('wheel.spin')}
            </button>
          </form>
        )}
      </section>
      {!player && !loading && <PlayCta onClick={() => setIdentifying(true)} />}
      {identifying && <PlayerIdentifyDialog onClose={() => setIdentifying(false)} onIdentified={identified} />}
    </main>
  );
}
