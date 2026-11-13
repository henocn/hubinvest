import { useEffect } from 'react';
import PublicPages from './PublicPages';
import { teamUrl } from './lib/team';

// Anciennes adresses de l'espace équipe : il vit désormais sur son propre sous-domaine.
const teamRedirects = [
  [/^\/(connexion|mot-de-passe-oublie)$/, (match) => `/${match[1]}`],
  [/^\/administration(\/.*)?$/, () => '/'],
  [/^\/espace-occupant\/defis$/, () => '/defis'],
  [/^\/espace-occupant\/profil$/, () => '/profil'],
  [/^\/espace-occupant$/, () => '/contacts'],
  [/^\/espace-animateur\/remises$/, () => '/remises'],
  [/^\/espace-animateur\/profil$/, () => '/profil'],
  [/^\/espace-animateur$/, () => '/scan'],
];

function TeamRedirect({ to }) {
  useEffect(() => { window.location.replace(teamUrl(to)); }, [to]);
  return null;
}

export default function App() {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  for (const [pattern, target] of teamRedirects) {
    const match = path.match(pattern);
    if (match) return <TeamRedirect to={target(match)} />;
  }
  return <PublicPages path={path} />;
}
