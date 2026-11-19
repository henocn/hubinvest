import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ContactRequestForm from '../components/ContactRequestForm';
import { SITE_NAME, setPageTitle } from '../lib/page-title';
import { api, resolveAssetUrl } from '../lib/api';
import { useSiteSettings } from '../lib/settings';
import { publicErrorMessage } from '../lib/public-error';

export default function StandDetailPage({ slug }) {
  const { t } = useTranslation();
  const settings = useSiteSettings();
  const [stand, setStand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.publicOccupant(slug)
      .then(setStand)
      .catch((requestError) => setError(requestError.status === 404 ? t('stands.unavailable') : publicErrorMessage(t, requestError)))
      .finally(() => setLoading(false));
  }, [slug, t]);

  // Titre d'onglet de la fiche une fois chargée.
  useEffect(() => {
    if (stand) setPageTitle(`${stand.name} · Stands · ${SITE_NAME}`);
  }, [stand]);

  return (
    <main className="public-container public-detail">
      <Link className="public-back" to="/stands"><ArrowLeft size={18} /> {t('stands.all')}</Link>
      {loading && <p className="public-message">{t('stands.loadingOne')}</p>}
      {error && <p className="public-message is-error">{error}</p>}
      {stand && (
        <article className="stand-profile">
          {stand.coverImageUrl && <img className="stand-profile-cover" src={resolveAssetUrl(stand.coverImageUrl)} alt="" />}
          <h1>{stand.name}</h1>
          {stand.standLabel && <p className="stand-profile-location"><MapPin size={19} /> {stand.standLabel}</p>}
          {stand.activity && <section className="stand-profile-section"><p>{stand.activity}</p></section>}
        </article>
      )}
      {stand && (settings.contactRequestsOpen ? <ContactRequestForm stand={stand} /> : <p className="public-message is-closed">{t('closed.contact')}</p>)}
    </main>
  );
}
