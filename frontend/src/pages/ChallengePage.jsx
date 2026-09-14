import { useEffect, useState } from 'react';
import ChallengePassportCard from '../components/ChallengePassportCard';
import ChallengeStartForm from '../components/ChallengeStartForm';
import { api } from '../lib/api';
import { useTranslation } from 'react-i18next';

export default function ChallengePage({ token }) {
  const { t } = useTranslation();
  const [passport, setPassport] = useState(null);
  const [personalToken, setPersonalToken] = useState(token || '');
  const [loading, setLoading] = useState(Boolean(token));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return undefined;
    let active = true;
    api.publicChallengePassport(token)
      .then((data) => { if (active) setPassport(data); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  const created = (data) => {
    window.history.replaceState({}, '', `/defis/${data.token}`);
    const { token: newToken, ...publicPassport } = data;
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

  return (
    <main className="public-container challenge-page">
      {!passport && !loading && !error && <section className="challenge-start-panel"><span className="public-eyebrow">{t('challenge.eyebrow')}</span><h1>{t('challenge.title')}</h1><p>{t('challenge.intro')}</p><ChallengeStartForm onCreated={created} /></section>}
      {loading && <p className="public-message">{t('challenge.loading')}</p>}
      {error && <p className="public-message is-error">{error}</p>}
      {passport && <ChallengePassportCard passport={passport} refreshing={refreshing} onRefresh={refresh} />}
    </main>
  );
}
