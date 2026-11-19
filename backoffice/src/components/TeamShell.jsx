import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LogOut, Menu, UserRound, X } from 'lucide-react';
import hubLogoWhite from '../assets/brand/hub-logo-white.png';
import hubLogo from '../assets/brand/hub-logo.png';
import PushToggleButton from '../admin/components/PushToggleButton';
import NotificationPrompt from './NotificationPrompt';
import { DashboardProvider, useDashboard } from '../admin/dashboard';
import { api, resolveAssetUrl } from '../lib/api';
import { disablePush } from '../lib/push';
import { useRealtimeConnection, useRealtimeEvent } from '../lib/realtime';
import { isAdminRole, linksForRole, roleLabels, tabsForRole } from '../navigation';
import { useSession } from '../session';

const adminTopics = ['occupants', 'users', 'program', 'contacts', 'investor-requests', 'b2b', 'studio', 'challenge', 'wheel', 'settings', 'live-questions', 'account'];
const teamTopics = ['contacts', 'challenge', 'occupants', 'live-questions', 'account'];

// Liens de navigation : NavLink marque la rubrique ouverte, y compris ses sous-pages (/contacts/nouveau…).
// La pastille donne le nombre exact d'éléments qui attendent une action dans la rubrique.
function NavItems({ links, className = '' }) {
  const todo = useDashboard()?.data?.todo || {};
  return links.map(({ path, label, Icon, section }) => {
    const count = section ? todo[section] || 0 : 0;
    return (
      <NavLink key={path} to={path} className={({ isActive }) => `${className}${isActive ? ' is-active' : ''}`.trim()} aria-label={count ? `${label}, ${count} à traiter` : undefined}>
        <span className="team-nav-icon">
          <Icon size={20} aria-hidden="true" />
          {count > 0 && <b className="team-badge" aria-hidden="true">{count}</b>}
        </span>
        <span>{label}</span>
      </NavLink>
    );
  });
}

// Cadre commun de l'espace équipe : façon application sur téléphone (barre verte en haut, onglets en bas,
// menu latéral), barre latérale fixe sur ordinateur.
export default function TeamShell() {
  const { session, logout } = useSession();
  const shell = <TeamShellLayout />;
  return isAdminRole(session.user.role) ? <DashboardProvider session={session} onLogout={logout}>{shell}</DashboardProvider> : shell;
}

function TeamShellLayout() {
  const { session, updateUser, logout } = useSession();
  const { user, token } = session;
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const panelRef = useRef(null);
  const isAdmin = isAdminRole(user.role);
  const links = linksForRole(user.role);
  const tabs = tabsForRole(user.role);
  const occupant = user.occupant;

  // Le profil (nom, stand, logo) modifié depuis l'administration s'affiche aussitôt.
  const refreshProfile = useCallback(() => api.profile(token)
    .then(updateUser)
    .catch((error) => { if (error.status === 401 || error.status === 403) logout(); }), [logout, token, updateUser]);

  useEffect(() => { void refreshProfile(); }, [refreshProfile]);

  useRealtimeConnection(`team:${user.id}:${token.slice(-16)}`, async () => {
    const { ticket } = await api.realtimeTicket(token);
    return api.realtimeStreamUrl(ticket);
  }, { topics: isAdmin ? adminTopics : teamTopics, onUnauthorized: logout });

  useRealtimeEvent(['occupants', 'account'], () => { void refreshProfile(); });

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    panelRef.current?.focus();
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  // Coupe les notifications de cet appareil avant de quitter volontairement la session.
  const signOut = async () => {
    await Promise.race([
      disablePush(token).catch(() => {}),
      new Promise((resolve) => { setTimeout(resolve, 1500); }),
    ]);
    logout();
  };

  return (
    <div className={`team-shell${menuOpen ? ' is-menu-open' : ''}`}>
      <header className="team-topbar">
        <button className="team-icon-button" type="button" onClick={() => setMenuOpen(true)} aria-label="Ouvrir le menu" aria-expanded={menuOpen} aria-controls="team-menu">
          <Menu size={24} />
        </button>
        <img className="team-topbar-logo" src={hubLogoWhite} alt="Hub de l’Investissement" />
      </header>

      {menuOpen && <div className="team-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />}

      <aside className="team-sidebar" id="team-menu" ref={panelRef} tabIndex={-1} aria-label="Menu">
        <div className="team-sidebar-head">
          <img className="team-sidebar-logo is-white" src={hubLogoWhite} alt="Hub de l’Investissement" />
          <img className="team-sidebar-logo is-color" src={hubLogo} alt="Hub de l’Investissement" />
          <button className="team-icon-button team-menu-close" type="button" onClick={() => setMenuOpen(false)} aria-label="Fermer le menu"><X size={22} /></button>
        </div>

        {occupant && (
          <div className="team-stand">
            {occupant.logoUrl
              ? <img src={resolveAssetUrl(occupant.logoUrl)} alt="" />
              : <span aria-hidden="true">{occupant.name.slice(0, 1).toUpperCase()}</span>}
            <strong>{occupant.name}</strong>
          </div>
        )}

        <nav className="team-nav" aria-label="Navigation principale">
          <NavItems links={links} />
        </nav>

        <div className="team-user">
          <span className="team-user-avatar"><UserRound size={18} /></span>
          <div>
            <strong>{user.firstName} {user.lastName}</strong>
            <span>{roleLabels[user.role]}</span>
          </div>
          <span className="team-user-actions admin-app">
            <PushToggleButton token={token} />
            <button className="admin-icon-button" type="button" onClick={signOut} aria-label="Se déconnecter" title="Se déconnecter"><LogOut size={18} /></button>
          </span>
        </div>
      </aside>

      <div className="team-content">
        {isAdmin ? <div className="admin-app"><Outlet /></div> : <Outlet />}
      </div>

      <NotificationPrompt token={token} />

      <nav className="team-tabs" aria-label="Rubriques principales">
        <div>
          <NavItems links={tabs} />
          {links.length > tabs.length && (
            <button type="button" onClick={() => setMenuOpen(true)} aria-label="Toutes les rubriques">
              <Menu size={20} aria-hidden="true" />
              <span>Plus</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
