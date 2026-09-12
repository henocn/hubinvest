import { useEffect, useState } from 'react';
import { ArrowLeft, MapPin } from 'lucide-react';
import ContactRequestForm from '../components/ContactRequestForm';
import { api, resolveAssetUrl } from '../lib/api';

export default function StandDetailPage({ slug }) {
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
          {stand.coverImageUrl && <img className="stand-profile-cover" src={resolveAssetUrl(stand.coverImageUrl)} alt="" />}
          <div className="stand-profile-top"><span className="public-eyebrow">Stand du Hub</span></div>
          <h1>{stand.name}</h1>
          {stand.standLabel && <p className="stand-profile-location"><MapPin size={19} /> {stand.standLabel}</p>}
          {stand.activity && <section className="stand-profile-section"><h2>Activité</h2><p>{stand.activity}</p></section>}
        </article>
      )}
      {stand && <ContactRequestForm stand={stand} />}
    </main>
  );
}
