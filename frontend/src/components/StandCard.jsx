import { MapPin } from 'lucide-react';
import { resolveAssetUrl } from '../lib/api';

export default function StandCard({ stand }) {
  return (
    <a className="stand-card" href={`/stands/${stand.slug}`}>
      <div className="stand-card-cover">
        {stand.coverImageUrl
          ? <img src={resolveAssetUrl(stand.coverImageUrl)} alt="" loading="lazy" />
          : <span aria-hidden="true" />}
      </div>
      <div className="stand-card-content">
        <h2>{stand.name}</h2>
        {stand.standLabel && <span className="stand-location"><MapPin size={14} /> {stand.standLabel}</span>}
        {stand.activity && <p>{stand.activity}</p>}
      </div>
    </a>
  );
}
