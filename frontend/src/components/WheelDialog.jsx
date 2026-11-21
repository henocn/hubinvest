import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PublicDialog from './PublicDialog';
import WheelOfFortune from './WheelOfFortune';
import { api } from '../lib/api';
import { publicErrorMessage } from '../lib/public-error';

const CODE_LENGTH = 4;
const CODE_CHARACTERS = /[^ABCDEFGHJKMNPQRSTUVWXYZ2-9]/g;

// Vitesses en degrés par seconde : la roue accélère tant qu'on appuie, puis ralentit jusqu'à la case tirée.
const START_SPEED = 260;
const MAX_SPEED = 1100;
const ACCELERATION = 950;
const RELEASE_SPEED = 640;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const mod = (value) => ((value % 360) + 360) % 360;

// Distance à parcourir pour s'arrêter au centre (à peu près) de la case gagnante, avec un ralentissement d'au moins minDuration.
const stopDistance = (angle, speed, target, minDuration) => {
  const aligned = mod(target - angle);
  const minimum = (speed * minDuration) / 3;
  return aligned >= minimum ? aligned : aligned + 360 * Math.ceil((minimum - aligned) / 360);
};

export default function WheelDialog({ player, onClose, onPlayerLost }) {
  const { t, i18n } = useTranslation();
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const discRef = useRef(null);
  const inputRef = useRef(null);
  const motion = useRef({ phase: 'idle', angle: 0, speed: 0, last: 0, frame: 0, stop: null, response: null });

  useEffect(() => {
    let active = true;
    api.publicWheel()
      .then((data) => { if (active) setSegments(data.segments); })
      .catch((requestError) => { if (active) setError(publicErrorMessage(t, requestError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [i18n.resolvedLanguage, t]);

  useEffect(() => () => window.cancelAnimationFrame(motion.current.frame), []);

  const paint = () => {
    if (discRef.current) discRef.current.style.transform = `rotate(${motion.current.angle}deg)`;
  };

  const finish = useCallback(() => {
    const state = motion.current;
    state.phase = 'idle';
    setBusy(false);
    const { response } = state;
    if (response?.data) {
      setOutcome(response.data);
      return;
    }
    if (response?.error?.code === 'WHEEL_PLAYER_REQUIRED') onPlayerLost();
    setError(publicErrorMessage(t, response?.error));
  }, [onPlayerLost, t]);

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

  // Appui sur la roue : le code part au serveur et la roue accélère.
  const press = (event) => {
    const state = motion.current;
    if (state.phase !== 'idle' || outcome || !segments.length) return;
    if (code.length !== CODE_LENGTH) {
      setError(t('wheel.codeRequired'));
      inputRef.current?.focus();
      return;
    }
    event.preventDefault();
    if (event.pointerId !== undefined) event.currentTarget.setPointerCapture?.(event.pointerId);
    setError('');
    setBusy(true);
    Object.assign(state, { phase: 'holding', speed: START_SPEED, response: null, last: performance.now() });
    api.spinWheel(code, player)
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

  // Un code peut donner plusieurs tours : « Tourner encore » garde le code, « Jouer avec un autre code » le vide.
  const spinAgain = () => {
    setOutcome(null);
    setError('');
  };

  const playAgain = () => {
    setOutcome(null);
    setCode('');
    setError('');
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const won = outcome?.result.kind === 'prize';

  return (
    <PublicDialog title={t('wheel.title')} onClose={onClose} locked={busy} className="wheel-dialog">
      {loading && <p className="public-message">{t('wheel.loading')}</p>}
      {!loading && !segments.length && <p className="public-message">{error || t('wheel.notReady')}</p>}
      {segments.length > 0 && (
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
          <WheelOfFortune segments={segments} discRef={discRef} />
        </div>
      )}

      {outcome ? (
        <div className={`wheel-result${won ? ' is-won' : ''}`} role="status">
          {won && <span>{t('wheel.won')}</span>}
          <strong>{outcome.result.label}</strong>
          <p>{won ? t('wheel.claim') : t('wheel.lost')}</p>
          {won && <code>{outcome.code}</code>}
          {outcome.spinsLeft > 0 && <button className="button button-primary" type="button" onClick={spinAgain}>{t('wheel.spinAgain', { count: outcome.spinsLeft })}</button>}
          <button className="button button-secondary" type="button" onClick={playAgain}>{t('wheel.playAgain')}</button>
        </div>
      ) : segments.length > 0 && (
        <div className="wheel-form">
          <label>
            {t('wheel.code')}
            <input
              ref={inputRef}
              value={code}
              onChange={(event) => { setCode(event.target.value.toUpperCase().replace(CODE_CHARACTERS, '').slice(0, CODE_LENGTH)); setError(''); }}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck="false"
              inputMode="text"
              maxLength={CODE_LENGTH}
              placeholder="A7K2"
              disabled={busy}
            />
          </label>
          {error ? <p className="form-error" role="alert">{error}</p> : <p className="wheel-hint">{busy ? t('wheel.spinning') : t('wheel.hint')}</p>}
        </div>
      )}
    </PublicDialog>
  );
}
