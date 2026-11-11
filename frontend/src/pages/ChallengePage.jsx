import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Disc3, Route } from 'lucide-react';
import ChallengePassportCard from '../components/ChallengePassportCard';
import PlayCta from '../components/PlayCta';
import PlayerIdentifyDialog from '../components/PlayerIdentifyDialog';
import NotFoundPage from './NotFoundPage';
import { api } from '../lib/api';
import { clearChallengePassportToken, readChallengePassportToken, saveChallengePassportToken } from '../lib/challenge-passport-store';
import { publicErrorMessage } from '../lib/public-error';
import { useRealtimeConnected, useRealtimeConnection, useRealtimeEvent } from '../lib/realtime';

// Présente un jeu des Défis : ce qu'on y gagne et comment y jouer.
function GameCard({ icon: Icon, tone, title, text, steps, doneSteps = 0, action }) {
  return (
    <article className={`play-game is-${tone}`}>
      <span className="play-game-icon" aria-hidden="true"><Icon size={26} /></span>
      <h2>{title}</h2>
      <p>{text}</p>
      <ol>{steps.map((step, index) => <li key={step} className={index < doneSteps ? 'is-done' : undefined}>{step}</li>)}</ol>
      {action}
    </article>
  );
}

export default function ChallengePage({ token }) {
  const { t } = useTranslation();
  const [initialToken] = useState(() => token || readChallengePassportToken());
  const [passport, setPassport] = useState(null);
  const [personalToken, setPersonalToken] = useState(initialToken);
  const [loading, setLoading] = useState(Boolean(initialToken));
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [identifying, setIdentifying] = useState(false);
  const passportRef = useRef(null);

  useEffect(() => {
    if (!personalToken || passport) return undefined;
    let active = true;
    api.publicChallengePassport(personalToken)
      .then((data) => {
        if (!active) return;
        saveChallengePassportToken(personalToken);
        setPassport(data);
      })
      .catch((requestError) => {
        if (!active) return;
        if (!token && requestError.status === 404) {
          clearChallengePassportToken();
          setPersonalToken('');
          setError('');
          return;
        }
        if (requestError.status === 404) {
          setNotFound(true);
          return;
        }
        setError(publicErrorMessage(t, requestError));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [passport, personalToken, t, token]);

  const identified = (data) => {
    window.history.replaceState({}, '', `/defis/${data.token}`);
    const { token: newToken, ...publicPassport } = data;
    saveChallengePassportToken(newToken);
    setPersonalToken(newToken);
    setPassport(publicPassport);
    setIdentifying(false);
  };

  const hasPassport = Boolean(passport?.code && personalToken);
  const updatingRef = useRef(false);

  const refresh = useCallback(() => {
    if (!personalToken || updatingRef.current || document.visibilityState !== 'visible') return;
    updatingRef.current = true;
    api.publicChallengePassport(personalToken)
      .then((data) => setPassport(data))
      .catch((requestError) => { if (requestError.status === 404) setNotFound(true); })
      .finally(() => { updatingRef.current = false; });
  }, [personalToken]);

  // Chaque passage validé sur un stand apparaît aussitôt sur le passeport du participant.
  useRealtimeConnection(hasPassport ? `passport:${personalToken}` : null, async () => api.challengePassportStreamUrl(personalToken), { topics: ['challenge'] });
  useRealtimeEvent('challenge', refresh);
  const realtimeConnected = useRealtimeConnected();

  useEffect(() => {
    if (!hasPassport) return undefined;
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [hasPassport, refresh]);

  // Rafraîchissement de secours seulement quand le flux en temps réel est coupé.
  useEffect(() => {
    if (!hasPassport || realtimeConnected) return undefined;
    const interval = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(interval);
  }, [hasPassport, realtimeConnected, refresh]);

  if (notFound) return <NotFoundPage />;

  const showPassport = () => passportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <main className="public-container challenge-page">
      <section className="play-intro">
        <span className="public-eyebrow">{t('challenge.eyebrow')}</span>
        <h1>{hasPassport ? t('play.welcome', { name: passport.displayName }) : t('play.title')}</h1>
        <p>{hasPassport ? t('play.readyIntro') : t('play.intro')}</p>
      </section>

      {loading && <p className="public-message">{t('challenge.loading')}</p>}
      {error && <p className="public-message is-error">{error}</p>}

      {!loading && (
        <div className="play-games">
          <GameCard
            icon={Route}
            tone="route"
            title={t('play.routeTitle')}
            text={hasPassport ? t('play.routeTextCount', { count: passport.requiredPassages }) : t('play.routeText')}
            steps={[t('play.routeStep1'), t('play.routeStep2'), t('play.routeStep3')]}
            doneSteps={hasPassport ? 1 : 0}
            action={hasPassport && <button className="button button-secondary" type="button" onClick={showPassport}>{t('play.routeAction')}<ArrowRight size={17} /></button>}
          />
          <GameCard
            icon={Disc3}
            tone="wheel"
            title={t('wheel.title')}
            text={t('play.wheelText')}
            steps={[t('play.wheelStep1'), t('play.wheelStep2'), t('play.wheelStep3')]}
            doneSteps={hasPassport ? 1 : 0}
            action={hasPassport && <a className="button button-primary" href="/roue">{t('play.wheelAction')}<ArrowRight size={17} /></a>}
          />
        </div>
      )}

      {passport && <div ref={passportRef} className="play-passport"><ChallengePassportCard passport={passport} /></div>}

      {!loading && !hasPassport && <PlayCta onClick={() => setIdentifying(true)} />}
      {identifying && <PlayerIdentifyDialog onClose={() => setIdentifying(false)} onIdentified={identified} />}
    </main>
  );
}
