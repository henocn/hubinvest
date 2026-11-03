import { CircleUserRound, Trophy, Users } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import apizfLogo from '../../../../assets/Logo sans fond.png';
import { api, resolveAssetUrl } from '../../lib/api';
import { useRealtimeEvent } from '../../lib/realtime';

const links = [
  { href: '/espace-occupant', label: 'Contacts', Icon: Users },
  { href: '/espace-occupant/defis', label: 'Défis', Icon: Trophy },
  { href: '/espace-occupant/profil', label: 'Profil', Icon: CircleUserRound },
];

const OccupantProfileContext = createContext(null);
export const useOccupantProfile = () => useContext(OccupantProfileContext);

export default function OccupantShell({ session, onLogout, children }) {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const [profile, setProfile] = useState(session.user);

  const loadProfile = useCallback((isActive = () => true) => api.profile(session.token)
    .then((user) => {
      if (!isActive()) return;
      setProfile(user);
      localStorage.setItem('hubinvest-session', JSON.stringify({ ...session, user }));
    })
    .catch((error) => {
      if (isActive() && (error.status === 401 || error.status === 403)) onLogout();
    }), [onLogout, session]);

  useEffect(() => {
    let active = true;
    void loadProfile(() => active);
    return () => { active = false; };
  }, [loadProfile]);

  // Le nom ou le logo du stand modifié au backoffice s'affiche aussitôt.
  useRealtimeEvent(['occupants', 'account'], () => { void loadProfile(); });

  const occupantName = profile?.occupant?.name || 'Espace occupant';

  return (
    <OccupantProfileContext.Provider value={profile}>
      <div className="occupant-shell">
        <header className="occupant-logo-header">
          <span className="occupant-apizf-logo-frame"><img className="occupant-apizf-logo" src={apizfLogo} alt="API-ZF" /></span>
          {profile?.occupant?.logoUrl
            ? <img className="occupant-institution-logo" src={resolveAssetUrl(profile.occupant.logoUrl)} alt={`Logo ${occupantName}`} />
            : <span className="occupant-logo-placeholder" aria-label={`Logo ${occupantName}`}>{occupantName.slice(0, 1).toUpperCase()}</span>}
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
    </OccupantProfileContext.Provider>
  );
}
