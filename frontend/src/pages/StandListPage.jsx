import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import StandCard from '../components/StandCard';
import { api } from '../lib/api';

export default function StandListPage({ isHome }) {
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
    const search = query.trim().toLocaleLowerCase('fr');
    if (!search) return stands;
    return stands.filter((stand) => [stand.name, stand.activity, stand.standLabel]
      .some((value) => value?.toLocaleLowerCase('fr').includes(search)));
  }, [stands, query]);

  return (
    <>
      <section className="public-intro">
        <div className="public-container">
          <span className="public-eyebrow">API-ZF · Hub de l’Investissement</span>
          <h1>{isHome ? 'Découvrez les acteurs du Hub.' : 'Les stands du Hub'}</h1>
          <p>Explorez les structures présentes et trouvez celles qui correspondent à votre recherche.</p>
        </div>
      </section>
      <main className="public-container public-main">
        <div className="public-section-heading">
          <div><span className="public-eyebrow">Annuaire</span><h2>Explorer les stands</h2></div>
          {!loading && !error && <span className="stand-count">{stands.length} stand{stands.length > 1 ? 's' : ''}</span>}
        </div>
        <label className="public-search">
          <Search size={20} aria-hidden="true" />
          <span className="sr-only">Rechercher un stand</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une structure ou une activité" />
        </label>
        {loading && <p className="public-message">Chargement des stands…</p>}
        {error && <div className="public-message is-error"><p>{error}</p><button type="button" onClick={() => window.location.reload()}>Réessayer</button></div>}
        {!loading && !error && filtered.length === 0 && <p className="public-message">{query ? 'Aucun stand ne correspond à cette recherche.' : 'Aucun stand actif pour le moment.'}</p>}
        {!loading && !error && filtered.length > 0 && <div className="stand-grid">{filtered.map((stand) => <StandCard stand={stand} key={stand.id} />)}</div>}
      </main>
    </>
  );
}
