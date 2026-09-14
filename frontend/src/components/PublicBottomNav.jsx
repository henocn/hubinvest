import { Handshake, Home, Search, Star, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const links = [
  { key: 'home', href: '/', Icon: Home, matches: (path) => path === '/' },
  { key: 'explore', href: '/stands', Icon: Search, matches: (path) => path.startsWith('/stands') },
  { key: 'meetings', href: '/rencontres', Icon: Handshake, matches: (path) => ['/rencontres', '/b2b', '/investor-desk', '/studio'].some((prefix) => path.startsWith(prefix)) },
  { key: 'play', href: '/defis', Icon: Star, matches: (path) => path.startsWith('/defis') },
  { key: 'account', href: '/connexion', Icon: UserRound, matches: (path) => path.startsWith('/connexion') || path.startsWith('/espace-occupant') },
];

export default function PublicBottomNav({ path }) {
  const { t } = useTranslation();

  return (
    <nav className="public-bottom-nav" aria-label={t('nav.label')}>
      <div>
        {links.map(({ key, href, Icon, matches }) => {
          const active = matches(path);
          return (
            <a key={key} href={href} className={active ? 'is-active' : ''} aria-current={active ? 'page' : undefined}>
              <Icon size={20} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
              <span>{t(`nav.${key}`)}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
