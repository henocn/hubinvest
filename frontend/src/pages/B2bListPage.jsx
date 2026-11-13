import { useEffect, useState } from 'react';
import B2bNeedCard from '../components/B2bNeedCard';
import { api } from '../lib/api';
import { useTranslation } from 'react-i18next';
import { publicErrorMessage } from '../lib/public-error';

export default function B2bListPage() {
  const { t } = useTranslation();
  const [needs, setNeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.publicB2bNeeds().then(setNeeds).catch((requestError) => setError(publicErrorMessage(t, requestError))).finally(() => setLoading(false));
  }, [t]);

  return (
    <>
      <section className="public-intro b2b-intro"><div className="public-container"><h1>{t('b2b.title')}</h1></div></section>
      <main className="public-container public-main">
        {loading && <p className="public-message">{t('b2b.loading')}</p>}
        {error && <div className="public-message is-error"><p>{error}</p><button type="button" onClick={() => window.location.reload()}>{t('common.retry')}</button></div>}
        {!loading && !error && needs.length === 0 && <p className="public-message">{t('b2b.empty')}</p>}
        {!loading && !error && needs.length > 0 && <div className="b2b-need-grid">{needs.map((need) => <B2bNeedCard key={need.id} need={need} />)}</div>}
      </main>
    </>
  );
}
