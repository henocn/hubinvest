import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Disc3, QrCode } from 'lucide-react';
import GameRulesDialog from '../components/GameRulesDialog';
import PlayCard from '../components/PlayCard';
import PlayCta from '../components/PlayCta';
import PlayerIdentifyDialog from '../components/PlayerIdentifyDialog';
import ScanMeDialog from '../components/ScanMeDialog';
import WheelDialog from '../components/WheelDialog';
import NotFoundPage from './NotFoundPage';
import { api } from '../lib/api';
import { clearChallengePassportToken, readChallengePassportToken, saveChallengePassportToken } from '../lib/challenge-passport-store';
import { publicErrorMessage } from '../lib/public-error';
import { useSiteSettings } from '../lib/settings';
import { useRealtimeConnected, useRealtimeConnection, useRealtimeEvent } from '../lib/realtime';

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
  const [rulesOpen, setRulesOpen] = useState(false);
  const wantsWheel = useRef(openWheel);
  const settings = useSiteSettings();
  const navigate = useNavigate();
  const location = useLocation();

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
    navigate(`/defis/${data.token}`, { replace: true });
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

  // Le lien /roue ouvre directement la roue, après l'identification si besoin ; rien ne s'ouvre si les jeux sont fermés.
  useEffect(() => {
    if (loading || !wantsWheel.current) return;
    if (!settings.challengeOpen || !settings.wheelOpen) {
      wantsWheel.current = false;
      return;
    }
    if (passport?.code) {
      wantsWheel.current = false;
      setWheelOpen(true);
    } else {
      setIdentifying(true);
    }
  }, [loading, passport, settings.challengeOpen, settings.wheelOpen]);

  const closeWheel = () => {
    setWheelOpen(false);
    if (location.pathname === '/roue') navigate('/defis', { replace: true });
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
        {!settings.challengeOpen && <p>{t('closed.challenge')}</p>}
        {/* Les explications des deux jeux, à la demande : les pastilles restent visuelles. */}
        <button className="button button-secondary play-rules-button" type="button" onClick={() => setRulesOpen(true)}><BookOpen size={18} />{t('rules.title')}</button>
      </section>

      {loading && <p className="public-message">{t('challenge.loading')}</p>}
      {error && <p className="public-message is-error">{error}</p>}

      {!loading && (
        <div className="play-games">
          <PlayCard
            tone="route"
            title={t('play.routeTitle')}
            progress={hasPassport ? { done: passport.passageCount, total: passport.requiredPassages, shown: true } : { done: 0, total: 5, shown: false }}
            progressLabel={hasPassport ? t('challenge.progress', { count: passport.passageCount, total: passport.requiredPassages }) : undefined}
            action={hasPassport && <button className="button button-secondary" type="button" onClick={() => setScanOpen(true)}><QrCode size={18} />{t('play.routeAction')}</button>}
          />
          <PlayCard
            tone="wheel"
            title={t('wheel.title')}
            action={hasPassport && (settings.wheelOpen
              ? <button className="button button-primary" type="button" onClick={() => setWheelOpen(true)}><Disc3 size={18} />{t('play.wheelAction')}</button>
              : <p className="play-closed">{t('closed.wheel')}</p>)}
          />
        </div>
      )}

      {!loading && !hasPassport && settings.challengeOpen && <PlayCta onClick={() => setIdentifying(true)} />}
      {identifying && <PlayerIdentifyDialog onClose={() => { setIdentifying(false); wantsWheel.current = false; }} onIdentified={identified} />}
      {rulesOpen && <GameRulesDialog onClose={() => setRulesOpen(false)} />}
      {scanOpen && hasPassport && <ScanMeDialog passport={passport} onClose={() => setScanOpen(false)} />}
      {wheelOpen && hasPassport && <WheelDialog player={personalToken} onClose={closeWheel} onPlayerLost={playerLost} />}
    </main>
  );
}
