import { useCallback, useEffect, useRef, useState } from 'react';
import ChallengePassportCard from '../components/ChallengePassportCard';
import ChallengeStartForm from '../components/ChallengeStartForm';
import NotFoundPage from './NotFoundPage';
import { api } from '../lib/api';
import { clearChallengePassportToken, readChallengePassportToken, saveChallengePassportToken } from '../lib/challenge-passport-store';
import { useTranslation } from 'react-i18next';
import { publicErrorMessage } from '../lib/public-error';
import { useRealtimeConnected, useRealtimeConnection, useRealtimeEvent } from '../lib/realtime';

export default function ChallengePage({ token }) {
  const { t } = useTranslation();
  const [initialToken] = useState(() => token || readChallengePassportToken());
  const [passport, setPassport] = useState(null);
  const [personalToken, setPersonalToken] = useState(initialToken);
  const [loading, setLoading] = useState(Boolean(initialToken));
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

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

  const created = (data) => {
    window.history.replaceState({}, '', `/defis/${data.token}`);
    const { token: newToken, ...publicPassport } = data;
    saveChallengePassportToken(newToken);
    setPersonalToken(newToken);
    setPassport(publicPassport);
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
      {!passport && !loading && !error && <section className="challenge-start-panel"><span className="public-eyebrow">{t('challenge.eyebrow')}</span><h1>{t('challenge.title')}</h1><p>{t('challenge.intro')}</p><ChallengeStartForm onCreated={created} /></section>}
      {loading && <p className="public-message">{t('challenge.loading')}</p>}
      {error && <p className="public-message is-error">{error}</p>}
      {passport && <ChallengePassportCard passport={passport} />}
    </main>
  );
}
