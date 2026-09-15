import { CircleUserRound, ScanLine } from 'lucide-react';
import apizfLogo from '../../../../assets/Logo sans fond.png';

const links = [
  { href: '/espace-animateur', label: 'Scan', Icon: ScanLine },
  { href: '/espace-animateur/profil', label: 'Profil', Icon: CircleUserRound },
];

export default function AnimatorShell({ children }) {
  const path = window.location.pathname.replace(/\/$/, '') || '/';

  return (
    <div className="occupant-shell animator-shell">
      <header className="occupant-logo-header animator-logo-header">
        <span className="occupant-apizf-logo-frame"><img className="occupant-apizf-logo" src={apizfLogo} alt="API-ZF" /></span>
      </header>
      {children}
      <nav className="occupant-bottom-nav animator-bottom-nav" aria-label="Navigation de l’espace animateur">
        <div>{links.map(({ href, label, Icon }) => {
          const active = path === href;
          return <a href={href} key={href} className={active ? 'is-active' : ''} aria-current={active ? 'page' : undefined}><Icon size={20} aria-hidden="true" /><span>{label}</span></a>;
        })}</div>
      </nav>
    </div>
  );
}
