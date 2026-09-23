import { useEffect, useState } from 'react';
import ChallengePassportCard from '../components/ChallengePassportCard';
import ChallengeStartForm from '../components/ChallengeStartForm';
import NotFoundPage from './NotFoundPage';
import { api } from '../lib/api';
import { clearChallengePassportToken, readChallengePassportToken, saveChallengePassportToken } from '../lib/challenge-passport-store';
import { useTranslation } from 'react-i18next';
import { publicErrorMessage } from '../lib/public-error';

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

  useEffect(() => {
    if (!passport?.code || !personalToken) return undefined;
    let active = true;
    let updating = false;

    const refresh = () => {
      if (!active || updating || document.visibilityState !== 'visible') return;
      updating = true;
      api.publicChallengePassport(personalToken)
        .then((data) => { if (active) setPassport(data); })
        .catch((requestError) => { if (active && requestError.status === 404) setNotFound(true); })
        .finally(() => { updating = false; });
    };

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const interval = window.setInterval(refresh, 30_000);
    return () => {
      active = false;
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.clearInterval(interval);
    };
  }, [passport?.code, personalToken]);

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
