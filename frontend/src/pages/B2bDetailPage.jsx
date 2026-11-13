import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import B2bProposalForm from '../components/B2bProposalForm';
import { SITE_NAME, setPageTitle } from '../lib/page-title';
import { api } from '../lib/api';
import { publicErrorMessage } from '../lib/public-error';

export default function B2bDetailPage({ id }) {
  const { t } = useTranslation();
  const [need, setNeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.publicB2bNeed(id).then(setNeed).catch((requestError) => setError(requestError.status === 404 ? t('b2b.unavailable') : publicErrorMessage(t, requestError))).finally(() => setLoading(false));
  }, [id, t]);

  // Titre d'onglet de la fiche une fois chargée.
  useEffect(() => {
    if (need) setPageTitle(`${need.title} · Besoin B2B · ${SITE_NAME}`);
  }, [need]);

  return (
    <main className="public-container b2b-detail-page">
      <Link className="public-back" to="/b2b"><ArrowLeft size={18} /> {t('b2b.all')}</Link>
      {loading && <p className="public-message">{t('b2b.loadingOne')}</p>}
      {error && <p className="public-message is-error">{error}</p>}
      {need && <>
        <article className="b2b-need-detail"><span className="public-eyebrow">{need.occupant.name}</span><h1>{need.title}</h1>{need.occupant.standLabel && <span className="b2b-detail-location"><MapPin size={16} /> {need.occupant.standLabel}</span>}<p>{need.description}</p></article>
        <section className="b2b-proposal-panel"><h2>{t('b2b.propose')}</h2><B2bProposalForm need={need} /></section>
      </>}
    </main>
  );
}
