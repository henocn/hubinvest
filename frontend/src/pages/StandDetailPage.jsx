import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ContactRequestForm from '../components/ContactRequestForm';
import ImageCarousel from '../components/ImageCarousel';
import { SITE_NAME, setPageTitle } from '../lib/page-title';
import { api, resolveAssetUrl } from '../lib/api';
import { useSiteSettings } from '../lib/settings';
import { publicErrorMessage } from '../lib/public-error';

// Produits et services : une entrée par ligne dans l'administration, affichée en liste (puces éventuelles retirées).
const lines = (value) => String(value || '')
  .split('\n')
  .map((line) => line.replace(/^[-•*]\s*/, '').trim())
  .filter(Boolean);

// Adresse du site affichée sans « https:// » ni « www. ».
const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

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
          <header className="stand-profile-head">
            {stand.logoUrl && <img className="stand-profile-logo" src={resolveAssetUrl(stand.logoUrl)} alt="" />}
            <div>
              <h1>{stand.name}</h1>
              <p className="stand-profile-facts">
                {stand.standLabel && <span><MapPin size={16} aria-hidden="true" /> {stand.standLabel}</span>}
                {stand.website && <a href={stand.website} target="_blank" rel="noreferrer">{hostOf(stand.website)} <ExternalLink size={14} aria-hidden="true" /></a>}
              </p>
            </div>
          </header>

          {stand.activity && (
            <section className="stand-profile-section">
              <h2>{t('stands.activities')}</h2>
              <p>{stand.activity}</p>
            </section>
          )}

          {(lines(stand.products).length > 0 || lines(stand.services).length > 0) && (
            <div className="stand-profile-offer">
              {lines(stand.products).length > 0 && (
                <section className="stand-profile-section">
                  <h2>{t('stands.products')}</h2>
                  <ul>{lines(stand.products).map((item) => <li key={item}>{item}</li>)}</ul>
                </section>
              )}
              {lines(stand.services).length > 0 && (
                <section className="stand-profile-section">
                  <h2>{t('stands.services')}</h2>
                  <ul>{lines(stand.services).map((item) => <li key={item}>{item}</li>)}</ul>
                </section>
              )}
            </div>
          )}

          {stand.gallery?.length > 0 && (
            <section className="stand-profile-section stand-profile-gallery">
              <h2>{t('stands.gallery')}</h2>
              <ImageCarousel images={stand.gallery.slice(0, 5)} label={t('stands.gallery')} />
            </section>
          )}
        </article>
      )}
      {stand && (settings.contactRequestsOpen ? <ContactRequestForm stand={stand} /> : <p className="public-message is-closed">{t('closed.contact')}</p>)}
    </main>
  );
}
