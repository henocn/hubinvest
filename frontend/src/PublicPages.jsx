import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Building2, BriefcaseBusiness, MapPin, Search } from 'lucide-react';
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
        <a href="/investor-desk">Investor Desk</a>
        <a className="public-login" href="/connexion">Espace occupant</a>
      </nav>
    </header>
  );
}

function StandCard({ stand }) {
  return (
    <a className="stand-card" href={`/stands/${stand.slug}`}>
      <div className="stand-card-cover">
        {stand.coverImageUrl
          ? <img src={stand.coverImageUrl} alt="" loading="lazy" />
          : <Building2 size={28} strokeWidth={1.6} aria-hidden="true" />}
      </div>
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
          {!loading && !error && <span className="stand-count">{stands.length} stand{stands.length > 1 ? 's' : ''}</span>}
        </div>
        <label className="public-search">
          <Search size={20} aria-hidden="true" />
          <span className="sr-only">Rechercher un stand</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une structure ou une activité" />
        </label>
        {loading && <p className="public-message">Chargement des stands…</p>}
        {error && <div className="public-message is-error"><p>{error}</p><button type="button" onClick={() => window.location.reload()}>Réessayer</button></div>}
        {!loading && !error && filtered.length === 0 && (
          <p className="public-message">{query ? 'Aucun stand ne correspond à cette recherche.' : 'Aucun stand actif pour le moment.'}</p>
        )}
        {!loading && !error && filtered.length > 0 && (
          <div className="stand-grid">{filtered.map((stand) => <StandCard stand={stand} key={stand.id} />)}</div>
        )}
      </main>
    </>
  );
}

function ContactRequestForm({ stand }) {
  const requestId = useRef(crypto.randomUUID());
  const [form, setForm] = useState({ fullName: '', phone: '', need: '', consentOccupant: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [received, setReceived] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.requestContact(stand.slug, { ...form, id: requestId.current });
      setReceived(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="request-panel" aria-labelledby="request-title">
      <div className="request-intro">
        <span className="public-eyebrow">Prendre contact</span>
        <h2 id="request-title">Être recontacté par ce stand</h2>
        <p>Adressez votre demande à l’équipe de {stand.name}.</p>
      </div>
      {received ? (
        <p className="request-success" role="status">Votre demande a été enregistrée. L’équipe de ce stand pourra vous recontacter.</p>
      ) : (
        <form className="request-form" onSubmit={submit}>
          <label>Nom complet<input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} minLength={2} maxLength={160} autoComplete="name" required /></label>
          <label>Téléphone<input type="tel" inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} minLength={6} maxLength={32} autoComplete="tel" required /></label>
          <label>Votre demande <span className="request-optional">facultatif</span><textarea value={form.need} onChange={(event) => setForm({ ...form, need: event.target.value })} rows={3} maxLength={4000} /></label>
          <label className="request-consent">
            <input type="checkbox" checked={form.consentOccupant} onChange={(event) => setForm({ ...form, consentOccupant: event.target.checked })} required />
            <span>J’accepte que {stand.name} utilise mes coordonnées pour répondre à cette demande.</span>
          </label>
          {error && <p className="request-error" role="alert">{error}</p>}
          <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Envoi en cours…' : 'Envoyer ma demande'}</button>
        </form>
      )}
    </section>
  );
}

function StandDetail({ slug }) {
  const [stand, setStand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.publicOccupant(slug)
      .then(setStand)
      .catch((requestError) => setError(requestError.status === 404 ? 'Ce stand n’est pas disponible ou n’existe plus.' : requestError.message))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <main className="public-container public-detail">
      <a className="public-back" href="/stands"><ArrowLeft size={18} /> Tous les stands</a>
      {loading && <p className="public-message">Chargement du stand…</p>}
      {error && <p className="public-message is-error">{error}</p>}
      {stand && (
        <article className="stand-profile">
          {stand.coverImageUrl && <img className="stand-profile-cover" src={stand.coverImageUrl} alt="" />}
          <div className="stand-profile-top">
            <span className="public-eyebrow">Stand du Hub</span>
          </div>
          <h1>{stand.name}</h1>
          {stand.standLabel && <p className="stand-profile-location"><MapPin size={19} /> {stand.standLabel}</p>}
          {stand.activity && <section className="stand-profile-section"><h2>Activité</h2><p>{stand.activity}</p></section>}
        </article>
      )}
      {stand && <ContactRequestForm stand={stand} />}
    </main>
  );
}

function InvestorDeskPage() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    projectSummary: '',
    consentApizf: false,
  });
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [received, setReceived] = useState(false);

  const field = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  const submit = async (event) => {
    event.preventDefault();
    if (step === 1) {
      setStep(2);
      setError('');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.createInvestorRequest(form);
      setReceived(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="public-container investor-desk-page">
      <section className="investor-desk-intro">
        <h1>Parlez-nous de votre projet</h1>
        <p>Investor Desk</p>
      </section>

      <section className="investor-request-panel">
        {received ? (
          <div className="investor-request-success" role="status">
            <span><BriefcaseBusiness size={23} /></span>
            <div><h2>Demande transmise</h2><p>L’Investor Desk dispose maintenant de votre projet et de vos coordonnées.</p></div>
          </div>
        ) : (
          <form className="investor-request-form" onSubmit={submit}>
            <div className="investor-step-progress" aria-label={`Étape ${step} sur 2`}>
              <span>{step} / 2</span>
              <div aria-hidden="true"><i className="is-complete" /><i className={step === 2 ? 'is-complete' : ''} /></div>
            </div>

            {step === 1 ? (
              <div className="investor-step">
                <label>Que souhaitez-vous réaliser ?<textarea value={form.projectSummary} onChange={(event) => field('projectSummary', event.target.value)} rows={7} minLength={10} maxLength={6000} autoFocus required /></label>
                <button className="button button-primary investor-next-button" type="submit">Continuer <ArrowRight size={17} /></button>
              </div>
            ) : (
              <div className="investor-step">
                <header><h2>Vos coordonnées</h2></header>
                <label>Nom complet<input value={form.fullName} onChange={(event) => field('fullName', event.target.value)} minLength={2} maxLength={160} autoComplete="name" autoFocus required /></label>
                <div className="public-field-row">
                  <label>Adresse e-mail<input type="email" value={form.email} onChange={(event) => field('email', event.target.value)} maxLength={180} autoComplete="email" required /></label>
                  <label><span className="public-field-label">Téléphone <small>facultatif</small></span><input type="tel" inputMode="tel" value={form.phone} onChange={(event) => field('phone', event.target.value)} maxLength={32} autoComplete="tel" /></label>
                </div>
                <label className="request-consent investor-consent">
                  <input type="checkbox" checked={form.consentApizf} onChange={(event) => field('consentApizf', event.target.checked)} required />
                  <span>J’accepte que l’API-ZF utilise mes coordonnées pour répondre à cette demande.</span>
                </label>
                {error && <p className="request-error" role="alert">{error}</p>}
                <div className="investor-form-actions">
                  <button className="button button-secondary" type="button" onClick={() => setStep(1)} disabled={loading}>Retour</button>
                  <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Envoi…' : 'Envoyer'}</button>
                </div>
              </div>
            )}
          </form>
        )}
      </section>
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
      {path === '/investor-desk' && <InvestorDeskPage />}
      {path !== '/' && path !== '/stands' && path !== '/investor-desk' && !detail && (
        <main className="public-container public-detail"><h1>Page introuvable</h1><a className="public-back" href="/stands">Voir les stands <ArrowRight size={18} /></a></main>
      )}
    </div>
  );
}
