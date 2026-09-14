import { Handshake, LogOut, Trophy, Users } from 'lucide-react';

const links = [
  { href: '/espace-occupant', label: 'Contacts', Icon: Users },
  { href: '/espace-occupant/b2b', label: 'B2B', Icon: Handshake },
  { href: '/espace-occupant/defis', label: 'Défis', Icon: Trophy },
];

export default function OccupantShell({ session, onLogout, children }) {
  const path = window.location.pathname.replace(/\/$/, '') || '/';

  return (
    <div className="occupant-shell">
      <header className="app-header">
        <div className="occupant-header-brand"><strong>HubInvest</strong><span>{session.user.occupant?.name}</span></div>
        <button className="icon-button" type="button" onClick={onLogout} aria-label="Se déconnecter"><LogOut size={20} /></button>
      </header>
      {children}
      <nav className="occupant-bottom-nav" aria-label="Navigation de l’espace occupant">
        <div>
          {links.map(({ href, label, Icon }) => {
            const active = path === href;
            return <a href={href} key={href} className={active ? 'is-active' : ''} aria-current={active ? 'page' : undefined}><Icon size={20} aria-hidden="true" /><span>{label}</span></a>;
          })}
        </div>
      </nav>
    </div>
  );
}
