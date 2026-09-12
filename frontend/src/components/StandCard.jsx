import { ArrowRight, Building2, MapPin } from 'lucide-react';
import { resolveAssetUrl } from '../lib/api';

export default function StandCard({ stand }) {
  return (
    <a className="stand-card" href={`/stands/${stand.slug}`}>
      <div className="stand-card-cover">
        {stand.coverImageUrl
          ? <img src={resolveAssetUrl(stand.coverImageUrl)} alt="" loading="lazy" />
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
