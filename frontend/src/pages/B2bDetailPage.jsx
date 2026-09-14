import { useEffect, useState } from 'react';
import { ArrowLeft, MapPin } from 'lucide-react';
import B2bProposalForm from '../components/B2bProposalForm';
import { api } from '../lib/api';

export default function B2bDetailPage({ id }) {
  const [need, setNeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.publicB2bNeed(id).then(setNeed).catch((requestError) => setError(requestError.status === 404 ? 'Ce besoin n’est plus disponible.' : requestError.message)).finally(() => setLoading(false));
  }, [id]);

  return (
    <main className="public-container b2b-detail-page">
      <a className="public-back" href="/b2b"><ArrowLeft size={18} /> Tous les besoins</a>
      {loading && <p className="public-message">Chargement du besoin…</p>}
      {error && <p className="public-message is-error">{error}</p>}
      {need && <>
        <article className="b2b-need-detail"><span className="public-eyebrow">{need.occupant.name}</span><h1>{need.title}</h1>{need.occupant.standLabel && <span className="b2b-detail-location"><MapPin size={16} /> {need.occupant.standLabel}</span>}<p>{need.description}</p></article>
        <section className="b2b-proposal-panel"><h2>Proposer une rencontre</h2><B2bProposalForm need={need} /></section>
      </>}
    </main>
  );
}
