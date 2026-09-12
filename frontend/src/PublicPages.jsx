import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Building2, MapPin, Search } from 'lucide-react';
import logo from '../../assets/Logo fond blanc.jpeg';
import { api } from './lib/api';
import './public.css';

function PublicHeader() {
  return (
    <header className="public-header">
      <a className="public-brand" href="/" aria-label="HubInvest, accueil">
        <img src={logo} alt="API-ZF" />
        <span><strong>HubInvest</strong><small>Hub de l’Investissement</small></span>
      </a>
      <nav aria-label="Navigation publique">
        <a href="/stands">Stands</a>
        <a className="public-login" href="/connexion">Espace occupant</a>
      </nav>
    </header>
  );
}

function StandCard({ stand }) {
  return (
    <a className="stand-card" href={`/stands/${stand.slug}`}>
      <div className="stand-card-mark" aria-hidden="true"><Building2 size={22} strokeWidth={1.8} /></div>
      <div className="stand-card-content">
        {stand.standLabel && <span className="stand-location"><MapPin size={14} /> {stand.standLabel}</span>}
        <h2>{stand.name}</h2>
        {stand.activity && <p>{stand.activity}</p>}
        <span className="stand-card-link">Voir le stand <ArrowRight size={17} /></span>
      </div>
    </a>
  );
}

function StandList({ isHome }) {
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
          {!loading && !error && <span className="stand-count">{stands.length} stand{stands.length > 1 ? 's' : ''} publié{stands.length > 1 ? 's' : ''}</span>}
        </div>
        <label className="public-search">
          <Search size={20} aria-hidden="true" />
          <span className="sr-only">Rechercher un stand</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une structure ou une activité" />
        </label>
        {loading && <p className="public-message">Chargement des stands…</p>}
        {error && <div className="public-message is-error"><p>{error}</p><button type="button" onClick={() => window.location.reload()}>Réessayer</button></div>}
        {!loading && !error && filtered.length === 0 && (
          <p className="public-message">{query ? 'Aucun stand ne correspond à cette recherche.' : 'Les stands seront visibles ici dès leur publication.'}</p>
        )}
        {!loading && !error && filtered.length > 0 && (
          <div className="stand-grid">{filtered.map((stand) => <StandCard stand={stand} key={stand.id} />)}</div>
        )}
      </main>
    </>
  );
}

function StandDetail({ slug }) {
  const [stand, setStand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.publicOccupant(slug)
      .then(setStand)
      .catch((requestError) => setError(requestError.status === 404 ? 'Ce stand n’est pas publié ou n’existe plus.' : requestError.message))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <main className="public-container public-detail">
      <a className="public-back" href="/stands"><ArrowLeft size={18} /> Tous les stands</a>
      {loading && <p className="public-message">Chargement du stand…</p>}
      {error && <p className="public-message is-error">{error}</p>}
      {stand && (
        <article className="stand-profile">
          <div className="stand-profile-top">
            <span className="public-eyebrow">Stand du Hub</span>
          </div>
          <h1>{stand.name}</h1>
          {stand.standLabel && <p className="stand-profile-location"><MapPin size={19} /> {stand.standLabel}</p>}
          {stand.activity && <section className="stand-profile-section"><h2>Activité</h2><p>{stand.activity}</p></section>}
        </article>
      )}
    </main>
  );
}

export default function PublicPages({ path }) {
  const detail = path.match(/^\/stands\/([a-z0-9-]+)$/);
  return (
    <div className="public-app">
      <PublicHeader />
      {(path === '/' || path === '/stands') && <StandList isHome={path === '/'} />}
      {detail && <StandDetail slug={detail[1]} />}
      {path !== '/' && path !== '/stands' && !detail && (
        <main className="public-container public-detail"><h1>Page introuvable</h1><a className="public-back" href="/stands">Voir les stands <ArrowRight size={18} /></a></main>
      )}
    </div>
  );
}
