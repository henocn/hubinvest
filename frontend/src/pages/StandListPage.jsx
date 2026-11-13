import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import StandCard from '../components/StandCard';
import { api } from '../lib/api';
import { publicErrorMessage } from '../lib/public-error';

// Affiche l'annuaire des stands avec une recherche par nom, activité ou emplacement.
export default function StandListPage() {
  const { t, i18n } = useTranslation();
  const [stands, setStands] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.publicOccupants()
      .then(setStands)
      .catch((requestError) => setError(publicErrorMessage(t, requestError)))
      .finally(() => setLoading(false));
  }, [t]);

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
          <h1>{t('stands.title')}</h1>
        </div>
      </section>
      <main className="public-container public-main">
        <label className="public-search">
          <Search size={20} aria-hidden="true" />
          <span className="sr-only">{t('stands.searchLabel')}</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('stands.searchPlaceholder')} />
        </label>
        {loading && <p className="public-message">{t('stands.loading')}</p>}
        {error && <div className="public-message is-error"><p>{error}</p></div>}
        {!loading && !error && filtered.length === 0 && <p className="public-message">{t(query ? 'stands.noResult' : 'stands.empty')}</p>}
        {!loading && !error && filtered.length > 0 && <div className="stand-grid">{filtered.map((stand) => <StandCard stand={stand} key={stand.id} />)}</div>}
      </main>
    </>
  );
}
