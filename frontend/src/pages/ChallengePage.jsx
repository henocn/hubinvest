import { useEffect, useState } from 'react';
import ChallengePassportCard from '../components/ChallengePassportCard';
import ChallengeStartForm from '../components/ChallengeStartForm';
import NotFoundPage from './NotFoundPage';
import { api } from '../lib/api';
import { clearChallengePassportToken, readChallengePassportToken, saveChallengePassportToken } from '../lib/challenge-passport-store';
import { useTranslation } from 'react-i18next';

export default function ChallengePage({ token }) {
  const { t } = useTranslation();
  const [initialToken] = useState(() => token || readChallengePassportToken());
  const [passport, setPassport] = useState(null);
  const [personalToken, setPersonalToken] = useState(initialToken);
  const [loading, setLoading] = useState(Boolean(initialToken));
  const [refreshing, setRefreshing] = useState(false);
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
        setError(requestError.message);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [passport, personalToken, token]);

  const created = (data) => {
    window.history.replaceState({}, '', `/defis/${data.token}`);
    const { token: newToken, ...publicPassport } = data;
    saveChallengePassportToken(newToken);
    setPersonalToken(newToken);
    setPassport(publicPassport);
  };

  const refresh = async () => {
    setRefreshing(true);
    setError('');
    try {
      setPassport(await api.publicChallengePassport(personalToken));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setRefreshing(false);
    }
  };

  if (notFound) return <NotFoundPage />;

  return (
    <main className="public-container challenge-page">
      {!passport && !loading && !error && <section className="challenge-start-panel"><span className="public-eyebrow">{t('challenge.eyebrow')}</span><h1>{t('challenge.title')}</h1><p>{t('challenge.intro')}</p><ChallengeStartForm onCreated={created} /></section>}
      {loading && <p className="public-message">{t('challenge.loading')}</p>}
      {error && <p className="public-message is-error">{error}</p>}
      {passport && <ChallengePassportCard passport={passport} refreshing={refreshing} onRefresh={refresh} />}
    </main>
  );
}
