import { Link } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function B2bNeedCard({ need }) {
  const { t } = useTranslation();
  return (
    <Link className="b2b-need-card" to={`/b2b/${need.id}`}>
      <span className="b2b-occupant">{need.occupant.name}</span>
      <h2>{need.title}</h2>
      <p>{need.description}</p>
      <footer>
        {need.occupant.standLabel && <span><MapPin size={14} /> {need.occupant.standLabel}</span>}
        <strong>{t('b2b.propose')} <ArrowRight size={16} /></strong>
      </footer>
    </Link>
  );
}
