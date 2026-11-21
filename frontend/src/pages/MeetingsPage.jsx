import { Link } from 'react-router-dom';
import { BriefcaseBusiness, Handshake } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Rencontres : une tuile par parcours, un titre parlant et une phrase ; toute la tuile mène à sa page.
// Deux par ligne sur téléphone, davantage sur grand écran.
export default function MeetingsPage() {
  const { t } = useTranslation();
  const tiles = [
    { href: '/guichets', Icon: BriefcaseBusiness, title: t('meetings.deskTile'), text: t('meetings.deskText'), tone: 'green' },
    { href: '/b2b', Icon: Handshake, title: t('meetings.b2bTile'), text: t('meetings.b2bText'), tone: 'yellow' },
  ];

  return (
    <main className="public-container meetings-page">
      <h1 className="sr-only">{t('meetings.title')}</h1>
      <nav className="tile-grid" aria-label={t('meetings.title')}>
        {tiles.map(({ href, Icon, title, text, tone }) => (
          <Link key={href} to={href} className={`tile is-${tone}`}>
            <span className="tile-icon" aria-hidden="true"><Icon size={26} /></span>
            <span className="tile-text"><strong>{title}</strong><small>{text}</small></span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
