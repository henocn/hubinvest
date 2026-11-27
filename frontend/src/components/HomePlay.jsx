import { Link } from 'react-router-dom';
import { Gift, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSiteSettings } from '../lib/settings';
import { DecoWheel } from './PlayCard';

// Bandeau jaune « Jouez et gagnez » : le Défi des stands et la Roue des opportunités, avec une petite roue qui tourne
// et un cadeau qui sautille. Masqué quand les deux jeux sont fermés depuis l'administration.
export default function HomePlay() {
  const { t } = useTranslation();
  const settings = useSiteSettings();
  if (settings.challengeOpen === false && settings.wheelOpen === false) return null;

  return (
    <section className="home-play" aria-labelledby="home-play-title">
      <div className="home-play-text">
        <h2 id="home-play-title">{t('home.playTitle')}</h2>
        <p>{t('home.playText')}</p>
        <Link className="button button-primary" to="/defis"><Star size={18} aria-hidden="true" />{t('home.play')}</Link>
      </div>
      <div className="home-play-visual" aria-hidden="true">
        <DecoWheel />
        <span className="home-play-pointer" />
        <Gift className="home-play-gift" size={34} strokeWidth={2.2} />
      </div>
    </section>
  );
}
