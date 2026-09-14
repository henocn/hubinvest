import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import StandCard from '../components/StandCard';
import { api } from '../lib/api';

export default function StandListPage({ isHome }) {
  const { t, i18n } = useTranslation();
  const [stands, setStands] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.publicOccupants()
      .then(setStands)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase(i18n.resolvedLanguage);
    if (!search) return stands;
    return stands.filter((stand) => [stand.name, stand.activity, stand.standLabel]
      .some((value) => value?.toLocaleLowerCase(i18n.resolvedLanguage).includes(search)));
  }, [stands, query, i18n.resolvedLanguage]);

  return (
    <>
      <section className="public-intro">
        <div className="public-container">
          <span className="public-eyebrow">{t('stands.eyebrow')}</span>
          <h1>{t(isHome ? 'stands.homeTitle' : 'stands.title')}</h1>
          <p>{t('stands.intro')}</p>
        </div>
      </section>
      <main className="public-container public-main">
        <div className="public-section-heading">
          <div><span className="public-eyebrow">{t('stands.directory')}</span><h2>{t('stands.explore')}</h2></div>
          {!loading && !error && <span className="stand-count">{t('stands.count', { count: stands.length })}</span>}
        </div>
        <label className="public-search">
          <Search size={20} aria-hidden="true" />
          <span className="sr-only">{t('stands.searchLabel')}</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('stands.searchPlaceholder')} />
        </label>
        {loading && <p className="public-message">{t('stands.loading')}</p>}
        {error && <div className="public-message is-error"><p>{error}</p><button type="button" onClick={() => window.location.reload()}>{t('common.retry')}</button></div>}
        {!loading && !error && filtered.length === 0 && <p className="public-message">{t(query ? 'stands.noResult' : 'stands.empty')}</p>}
        {!loading && !error && filtered.length > 0 && <div className="stand-grid">{filtered.map((stand) => <StandCard stand={stand} key={stand.id} />)}</div>}
      </main>
    </>
  );
}
