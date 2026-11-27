import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Gift, Heart, PartyPopper, RotateCcw } from 'lucide-react';
import Confetti from './Confetti';
import PublicDialog from './PublicDialog';
import WheelOfFortune from './WheelOfFortune';
import { api } from '../lib/api';
import { publicErrorMessage } from '../lib/public-error';

// Vitesses en degrés par seconde : la roue accélère tant qu'on appuie, puis ralentit jusqu'à la case tirée.
const START_SPEED = 260;
const MAX_SPEED = 1100;
const ACCELERATION = 950;
const RELEASE_SPEED = 640;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const mod = (value) => ((value % 360) + 360) % 360;

// Petite vibration sur téléphone (Android) : un léger tic à chaque case, une salve quand on gagne.
const vibrate = (pattern) => { if (!reducedMotion()) navigator.vibrate?.(pattern); };

// Distance à parcourir pour s'arrêter au centre (à peu près) de la case gagnante, avec un ralentissement d'au moins minDuration.
const stopDistance = (angle, speed, target, minDuration) => {
  const aligned = mod(target - angle);
  const minimum = (speed * minDuration) / 3;
  return aligned >= minimum ? aligned : aligned + 360 * Math.ceil((minimum - aligned) / 360);
};

// Sans code : le joueur identifié voit la roue et la fait tourner en appuyant dessus, autant de tours que le réglage
// du back office (« Tours de roue par joueur »), comptés par le serveur.
export default function WheelDialog({ player, onClose, onPlayerLost }) {
  const { t, i18n } = useTranslation();
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [spinsLeft, setSpinsLeft] = useState(null);
  // Lot déjà gagné : la partie est finie, la fenêtre rappelle le lot et où le récupérer.
  const [previousWin, setPreviousWin] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const discRef = useRef(null);
  const pointerRef = useRef(null);
  // Fonction du parent recréée à chaque rendu : gardée à part pour ne pas recharger la roue.
  const playerLost = useRef(onPlayerLost);
  playerLost.current = onPlayerLost;
  const motion = useRef({ phase: 'idle', angle: 0, speed: 0, last: 0, frame: 0, stop: null, response: null });

  useEffect(() => {
    let active = true;
    Promise.all([api.publicWheel(), api.wheelStatus(player)])
      .then(([wheel, status]) => {
        if (!active) return;
        setSegments(wheel.segments);
        setSpinsLeft(status.spinsLeft);
        setPreviousWin(status.won || null);
      })
      .catch((requestError) => {
        if (!active) return;
        if (requestError.code === 'WHEEL_PLAYER_REQUIRED') playerLost.current();
        setError(publicErrorMessage(t, requestError));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [i18n.resolvedLanguage, player, t]);

  useEffect(() => () => window.cancelAnimationFrame(motion.current.frame), []);

  // À chaque séparation de case qui passe sous l'aiguille, l'aiguille reçoit un petit coup (et le téléphone un tic).
  const paint = () => {
    const state = motion.current;
    if (discRef.current) discRef.current.style.transform = `rotate(${state.angle}deg)`;
    const slice = 360 / Math.max(state.count, 1);
    const crossed = Math.floor(state.angle / slice);
    if (crossed !== state.crossed) {
      state.crossed = crossed;
      if (!reducedMotion()) {
        pointerRef.current?.animate(
          [{ transform: 'translateX(-50%) rotate(0deg)' }, { transform: 'translateX(-50%) rotate(-22deg)' }, { transform: 'translateX(-50%) rotate(0deg)' }],
          { duration: Math.min(160, Math.max(60, 9000 / Math.max(state.speed, 1))), easing: 'ease-out' },
        );
      }
      if (state.speed < 700) vibrate(4);
    }
  };

  const finish = useCallback(() => {
    const state = motion.current;
    state.phase = 'idle';
    setBusy(false);
    const { response } = state;
    if (response?.data) {
      setOutcome(response.data);
      setSpinsLeft(response.data.spinsLeft);
      if (response.data.result.kind === 'prize') vibrate([60, 40, 60, 40, 120]);
      return;
    }
    if (response?.error?.code === 'WHEEL_PLAYER_REQUIRED') playerLost.current();
    if (response?.error?.code === 'WHEEL_NO_SPINS_LEFT' || response?.error?.code === 'WHEEL_ALREADY_WON') setSpinsLeft(0);
    setError(publicErrorMessage(t, response?.error));
  }, [t]);

  // Lance le ralentissement : vers la case tirée si le serveur a répondu, sinon un simple arrêt en cas d'erreur.
  const startStopping = useCallback((now) => {
    const state = motion.current;
    const speed = Math.max(state.speed, RELEASE_SPEED);
    const minDuration = reducedMotion() ? 0.9 : 3.2;
    let distance = (speed * 1.1) / 3;
    const data = state.response?.data;
    if (data) {
      const count = data.segments.length;
      const index = Math.max(data.segments.findIndex((segment) => segment.id === data.result.id), 0);
      const slice = 360 / count;
      const jitter = (Math.random() - 0.5) * slice * 0.6;
      setSegments(data.segments);
      distance = stopDistance(state.angle, speed, -((index + 0.5) * slice) + jitter, minDuration);
    }
    state.stop = { from: state.angle, distance, duration: (3 * distance) / speed, start: now };
    state.phase = 'stopping';
  }, []);

  const tick = useCallback((now) => {
    const state = motion.current;
    const elapsed = Math.min((now - state.last) / 1000, 0.05);
    state.last = now;

    if (state.phase === 'holding') {
      state.speed = Math.min(MAX_SPEED, state.speed + ACCELERATION * elapsed);
      state.angle += state.speed * elapsed;
      if (state.response?.error) startStopping(now);
    } else if (state.phase === 'coasting') {
      state.angle += state.speed * elapsed;
      if (state.response) startStopping(now);
    }

    if (state.phase === 'stopping') {
      const { from, distance, duration, start } = state.stop;
      const progress = Math.min((now - start) / 1000 / duration, 1);
      state.angle = from + distance * (1 - (1 - progress) ** 3);
      paint();
      if (progress >= 1) {
        finish();
        return;
      }
    } else {
      paint();
    }
    state.frame = window.requestAnimationFrame(tick);
  }, [finish, startStopping]);

  // Appui sur la roue : le tirage part au serveur et la roue accélère.
  const press = (event) => {
    const state = motion.current;
    if (state.phase !== 'idle' || outcome || !segments.length || !(spinsLeft > 0)) return;
    event.preventDefault();
    if (event.pointerId !== undefined) event.currentTarget.setPointerCapture?.(event.pointerId);
    setError('');
    setBusy(true);
    Object.assign(state, { phase: 'holding', speed: START_SPEED, response: null, last: performance.now() });
    api.spinWheel(player, segments.map((segment) => segment.id))
      .then((data) => { state.response = { data }; })
      .catch((requestError) => { state.response = { error: requestError }; });
    state.frame = window.requestAnimationFrame(tick);
  };

  // Relâchement : la roue garde son élan jusqu'à la réponse du serveur, puis ralentit.
  const release = () => {
    const state = motion.current;
    if (state.phase !== 'holding') return;
    state.speed = Math.max(state.speed, RELEASE_SPEED);
    state.phase = 'coasting';
  };

  const pressWithKeyboard = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    press(event);
    release();
  };

  // Plusieurs tours possibles (réglage) : « Tourner encore » tant qu'il en reste.
  const spinAgain = () => {
    setOutcome(null);
    setError('');
  };

  // Nombre de cases lu par paint, appelé image par image hors de React.
  motion.current.count = segments.length;
  const won = outcome?.result.kind === 'prize';
  const winner = outcome ? segments.findIndex((segment) => segment.id === outcome.result.id) : -1;

  return (
    <PublicDialog title={t('wheel.title')} onClose={onClose} locked={busy} className="wheel-dialog">
      {loading && <p className="public-message">{t('wheel.loading')}</p>}
      {!loading && !segments.length && <p className="public-message">{error || t('wheel.notReady')}</p>}
      {!loading && previousWin && !outcome && (
        <div className="wheel-result is-won" role="status">
          <span><Gift size={18} aria-hidden="true" />{t('wheel.alreadyWon')}</span>
          <strong>{previousWin.label}</strong>
          <p>{t('wheel.claim')}</p>
        </div>
      )}
      {!loading && !previousWin && segments.length > 0 && spinsLeft === 0 && !outcome && <p className="public-message">{t('wheel.noSpins')}</p>}
      {segments.length > 0 && (spinsLeft > 0 || outcome) && (
        <div
          className={`wheel-stage${busy ? ' is-busy' : ''}`}
          role="button"
          tabIndex={0}
          aria-label={t('wheel.press')}
          onPointerDown={press}
          onPointerUp={release}
          onPointerCancel={release}
          onLostPointerCapture={release}
          onKeyDown={pressWithKeyboard}
          onContextMenu={(event) => event.preventDefault()}
        >
          <WheelOfFortune segments={segments} discRef={discRef} pointerRef={pointerRef} spinning={busy} winner={won ? winner : -1} />
          {won && <Confetti key={outcome.code + outcome.spinsLeft} />}
        </div>
      )}

      {outcome ? (
        <div className={`wheel-result${won ? ' is-won' : ''}`} role="status">
          {won ? <span><PartyPopper size={18} aria-hidden="true" />{t('wheel.won')}</span> : <Heart className="wheel-result-icon" size={22} aria-hidden="true" />}
          <strong>{outcome.result.label}</strong>
          <p>{won ? t('wheel.claim') : t('wheel.lost')}</p>
          {outcome.spinsLeft > 0 && <button className="button button-primary" type="button" onClick={spinAgain}><RotateCcw size={17} aria-hidden="true" />{t('wheel.spinAgain', { count: outcome.spinsLeft })}</button>}
        </div>
      ) : segments.length > 0 && spinsLeft > 0 && (
        <div className="wheel-form">
          {error ? <p className="form-error" role="alert">{error}</p> : <p className="wheel-hint">{busy ? t('wheel.spinning') : `${t('wheel.hint')} ${t('wheel.turns', { count: spinsLeft })}.`}</p>}
        </div>
      )}
    </PublicDialog>
  );
}
