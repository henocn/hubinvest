import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Disc3, QrCode, Route } from 'lucide-react';
import ChallengeProgress from '../components/ChallengeProgress';
import PlayCta from '../components/PlayCta';
import PlayerIdentifyDialog from '../components/PlayerIdentifyDialog';
import ScanMeDialog from '../components/ScanMeDialog';
import WheelDialog from '../components/WheelDialog';
import NotFoundPage from './NotFoundPage';
import { api } from '../lib/api';
import { clearChallengePassportToken, readChallengePassportToken, saveChallengePassportToken } from '../lib/challenge-passport-store';
import { publicErrorMessage } from '../lib/public-error';
import { useRealtimeConnected, useRealtimeConnection, useRealtimeEvent } from '../lib/realtime';

// Présente un jeu des Défis : ce qu'on y gagne et comment y jouer.
function GameCard({ icon: Icon, tone, title, text, steps, doneSteps = 0, badge, action, children }) {
  return (
    <article className={`play-game is-${tone}`}>
      <div className="play-game-top">
        <span className="play-game-icon" aria-hidden="true"><Icon size={26} /></span>
        {badge}
      </div>
      <h2>{title}</h2>
      <p>{text}</p>
      <ol>{steps.map((step, index) => <li key={step} className={index < doneSteps ? 'is-done' : undefined}>{step}</li>)}</ol>
      {children}
      {action}
    </article>
  );
}

export default function ChallengePage({ token, openWheel = false }) {
  const { t } = useTranslation();
  const [initialToken] = useState(() => token || readChallengePassportToken());
  const [passport, setPassport] = useState(null);
  const [personalToken, setPersonalToken] = useState(initialToken);
  const [loading, setLoading] = useState(Boolean(initialToken));
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [identifying, setIdentifying] = useState(false);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const wantsWheel = useRef(openWheel);

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
    if (wantsWheel.current) {
      wantsWheel.current = false;
      setWheelOpen(true);
    }
  };

  // Le lien /roue ouvre directement la roue, après l'identification si besoin.
  useEffect(() => {
    if (loading || !wantsWheel.current) return;
    if (passport?.code) {
      wantsWheel.current = false;
      setWheelOpen(true);
    } else {
      setIdentifying(true);
    }
  }, [loading, passport]);

  const closeWheel = () => {
    setWheelOpen(false);
    if (window.location.pathname === '/roue') window.history.replaceState({}, '', '/defis');
  };

  // Le parcours n'existe plus côté serveur : le joueur doit se réidentifier.
  const playerLost = () => {
    clearChallengePassportToken();
    setPersonalToken('');
    setPassport(null);
    setWheelOpen(false);
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

  return (
    <main className="public-container challenge-page">
      <section className="play-intro">
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
            badge={hasPassport && <span className="play-game-badge" aria-label={t('challenge.progress', { count: passport.passageCount, total: passport.requiredPassages })}><strong>{passport.passageCount} / {passport.requiredPassages}</strong><small>{t('challenge.validated')}</small></span>}
            action={hasPassport && <button className="button button-secondary" type="button" onClick={() => setScanOpen(true)}><QrCode size={18} />{t('play.routeAction')}</button>}
          >
            {hasPassport && <ChallengeProgress passport={passport} />}
          </GameCard>
          <GameCard
            icon={Disc3}
            tone="wheel"
            title={t('wheel.title')}
            text={t('play.wheelText')}
            steps={[t('play.wheelStep1'), t('play.wheelStep2'), t('play.wheelStep3')]}
            doneSteps={hasPassport ? 1 : 0}
            action={hasPassport && <button className="button button-primary" type="button" onClick={() => setWheelOpen(true)}><Disc3 size={18} />{t('play.wheelAction')}</button>}
          />
        </div>
      )}

      {!loading && !hasPassport && <PlayCta onClick={() => setIdentifying(true)} />}
      {identifying && <PlayerIdentifyDialog onClose={() => { setIdentifying(false); wantsWheel.current = false; }} onIdentified={identified} />}
      {scanOpen && hasPassport && <ScanMeDialog passport={passport} onClose={() => setScanOpen(false)} />}
      {wheelOpen && hasPassport && <WheelDialog player={personalToken} onClose={closeWheel} onPlayerLost={playerLost} />}
    </main>
  );
}
