import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api, resolveAssetUrl } from '../lib/api';

// Défilé des stands en bas du bandeau d'accueil : les vraies photos des stands passent en continu (pause au survol ou
// au toucher), chacune mène à sa fiche. La liste est doublée pour boucler sans saut ; la copie est cachée aux lecteurs
// d'écran et au clavier. Si l'appareil demande moins d'animations, la bande se fait défiler à la main.
export default function HomeStandsReel() {
  const { t } = useTranslation();
  const [stands, setStands] = useState([]);

  useEffect(() => {
    let active = true;
    api.publicOccupants()
      .then((data) => { if (active) setStands((data || []).filter((stand) => stand.coverImageUrl)); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  if (stands.length < 3) return null;

  const item = (stand, copy) => (
    <li key={`${copy ? 'b' : 'a'}-${stand.id}`} aria-hidden={copy || undefined}>
      <Link to={`/stands/${stand.slug}`} tabIndex={copy ? -1 : undefined}>
        <span className="home-reel-photo"><img src={resolveAssetUrl(stand.coverImageUrl)} alt="" loading="lazy" /></span>
        <span className="home-reel-name">{stand.name}</span>
      </Link>
    </li>
  );

  return (
    <div className="home-reel">
      <div className="public-container">
        <Link className="home-reel-title" to="/stands">{t('home.standsReel', { count: stands.length })}<ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
      <div className="home-reel-viewport">
        <ul className="home-reel-track" style={{ '--reel-duration': `${stands.length * 4.5}s` }}>
          {stands.map((stand) => item(stand, false))}
          {stands.map((stand) => item(stand, true))}
        </ul>
      </div>
    </div>
  );
}
