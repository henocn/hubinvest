import { useEffect, useState } from 'react';
import { ArrowLeft, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ContactRequestForm from '../components/ContactRequestForm';
import { api, resolveAssetUrl } from '../lib/api';
import { publicErrorMessage } from '../lib/public-error';

export default function StandDetailPage({ slug }) {
  const { t } = useTranslation();
  const [stand, setStand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.publicOccupant(slug)
      .then(setStand)
      .catch((requestError) => setError(requestError.status === 404 ? t('stands.unavailable') : publicErrorMessage(t, requestError)))
      .finally(() => setLoading(false));
  }, [slug, t]);

  return (
    <main className="public-container public-detail">
      <a className="public-back" href="/stands"><ArrowLeft size={18} /> {t('stands.all')}</a>
      {loading && <p className="public-message">{t('stands.loadingOne')}</p>}
      {error && <p className="public-message is-error">{error}</p>}
      {stand && (
        <article className="stand-profile">
          {stand.coverImageUrl && <img className="stand-profile-cover" src={resolveAssetUrl(stand.coverImageUrl)} alt="" />}
          <div className="stand-profile-top"><span className="public-eyebrow">{t('stands.hubStand')}</span></div>
          <h1>{stand.name}</h1>
          {stand.standLabel && <p className="stand-profile-location"><MapPin size={19} /> {stand.standLabel}</p>}
          {stand.activity && <section className="stand-profile-section"><h2>{t('stands.activity')}</h2><p>{stand.activity}</p></section>}
        </article>
      )}
      {stand && <ContactRequestForm stand={stand} />}
    </main>
  );
}
