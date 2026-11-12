import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Briefcase, Handshake, Home, LogIn, Menu, Search, Star, X } from 'lucide-react';
import hubLogoWhite from '../assets/brand/hub-logo-white.png';
import BrandFooter from './BrandFooter';

function LanguageFlag({ language }) {
  if (language === 'fr') {
    return <svg viewBox="0 0 18 12" aria-hidden="true"><path fill="#002395" d="M0 0h6v12H0z" /><path fill="#fff" d="M6 0h6v12H6z" /><path fill="#ED2939" d="M12 0h6v12h-6z" /></svg>;
  }

  return (
    <svg viewBox="0 0 18 12" aria-hidden="true">
      <path fill="#012169" d="M0 0h18v12H0z" />
      <path stroke="#fff" strokeWidth="2.4" d="m0 0 18 12M18 0 0 12" />
      <path stroke="#C8102E" strokeWidth="1.1" d="m0 0 18 12M18 0 0 12" />
      <path stroke="#fff" strokeWidth="4" d="M9 0v12M0 6h18" />
      <path stroke="#C8102E" strokeWidth="2.2" d="M9 0v12M0 6h18" />
    </svg>
  );
}

const menuLinks = [
  { key: 'home', href: '/', Icon: Home, matches: (path) => path === '/' },
  { key: 'stands', href: '/stands', Icon: Search, matches: (path) => path.startsWith('/stands') },
  { key: 'meetings', href: '/rencontres', Icon: Handshake, matches: (path) => path === '/rencontres' || path.startsWith('/b2b') },
  { key: 'investorDesk', href: '/investor-desk', Icon: Briefcase, matches: (path) => path === '/investor-desk' },
  { key: 'challenges', href: '/defis', Icon: Star, matches: (path) => path.startsWith('/defis') || path === '/roue' },
];

// Panneau latéral : toutes les rubriques, le choix de la langue et l'accès de l'équipe.
function SideMenu({ path, onClose }) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'fr';
  const panelRef = useRef(null);

  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div className="side-menu-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside ref={panelRef} tabIndex={-1} className="side-menu" id="side-menu" role="dialog" aria-modal="true" aria-label={t('nav.menu')}>
        <header>
          <img src={hubLogoWhite} alt={t('brand.subtitle')} />
          <button type="button" onClick={onClose} aria-label={t('common.close')}><X size={22} /></button>
        </header>

        <nav aria-label={t('nav.label')}>
          {menuLinks.map(({ key, href, Icon, matches }) => {
            const active = matches(path);
            return (
              <a key={key} href={href} className={active ? 'is-active' : ''} aria-current={active ? 'page' : undefined}>
                <Icon size={20} aria-hidden="true" />
                <span>{t(`nav.${key}`)}</span>
              </a>
            );
          })}
        </nav>

        <div className="side-menu-section">
          <span>{t('language.label')}</span>
          <div className="side-menu-languages" role="group" aria-label={t('language.label')}>
            {['fr', 'en'].map((code) => (
              <button key={code} type="button" className={language === code ? 'is-active' : ''} aria-pressed={language === code} onClick={() => i18n.changeLanguage(code)}>
                <span className="language-select-flag" aria-hidden="true"><LanguageFlag language={code} /></span>
                {t(code === 'fr' ? 'language.french' : 'language.english')}
              </button>
            ))}
          </div>
        </div>

        <a className="side-menu-team" href="/connexion"><LogIn size={19} aria-hidden="true" />{t('nav.team')}</a>

        <BrandFooter className="side-menu-footer" />
      </aside>
    </div>
  );
}

export default function PublicHeader({ path }) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <>
      <header className="public-header">
        <button className="public-menu-button" type="button" onClick={() => setMenuOpen(true)} aria-label={t('nav.menu')} aria-expanded={menuOpen} aria-controls="side-menu">
          <Menu size={24} />
        </button>
        <a className="public-brand" href="/" aria-label={t('brand.homeLabel')}>
          <img src={hubLogoWhite} alt={t('brand.subtitle')} />
        </a>
      </header>
      {menuOpen && <SideMenu path={path} onClose={closeMenu} />}
    </>
  );
}
