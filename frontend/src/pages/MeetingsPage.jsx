import { Link } from 'react-router-dom';
import { BriefcaseBusiness, Handshake } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Rencontres : une tuile par parcours, avec un titre parlant ; toute la tuile mène à sa page.
// Deux par ligne sur téléphone, davantage sur grand écran.
export default function MeetingsPage() {
  const { t } = useTranslation();
  const tiles = [
    { href: '/b2b', Icon: Handshake, title: t('meetings.b2bTile'), tone: 'green' },
    { href: '/guichets', Icon: BriefcaseBusiness, title: t('meetings.deskTile'), tone: 'yellow' },
  ];

  return (
    <main className="public-container meetings-page">
      <h1 className="sr-only">{t('meetings.title')}</h1>
      <nav className="tile-grid" aria-label={t('meetings.title')}>
        {tiles.map(({ href, Icon, title, tone }) => (
          <Link key={href} to={href} className={`tile is-${tone}`}>
            <span className="tile-icon" aria-hidden="true"><Icon size={26} /></span>
            <strong>{title}</strong>
          </Link>
        ))}
      </nav>
    </main>
  );
}
