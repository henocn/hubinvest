import { useEffect, useState } from 'react';
import B2bNeedCard from '../components/B2bNeedCard';
import { api } from '../lib/api';

export default function B2bListPage() {
  const [needs, setNeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.publicB2bNeeds().then(setNeeds).catch((requestError) => setError(requestError.message)).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <section className="public-intro b2b-intro"><div className="public-container"><span className="public-eyebrow">Rencontres professionnelles</span><h1>Les besoins B2B</h1><p>Consultez les besoins publiés par les structures du Hub.</p></div></section>
      <main className="public-container public-main">
        {loading && <p className="public-message">Chargement des besoins…</p>}
        {error && <div className="public-message is-error"><p>{error}</p><button type="button" onClick={() => window.location.reload()}>Réessayer</button></div>}
        {!loading && !error && needs.length === 0 && <p className="public-message">Aucun besoin ouvert pour le moment.</p>}
        {!loading && !error && needs.length > 0 && <div className="b2b-need-grid">{needs.map((need) => <B2bNeedCard key={need.id} need={need} />)}</div>}
      </main>
    </>
  );
}
