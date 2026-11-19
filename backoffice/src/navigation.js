import { Building2, BriefcaseBusiness, CalendarDays, CircleUserRound, Disc3, Gift, Handshake, LayoutDashboard, ScanLine, SlidersHorizontal, Trophy, Users, Video } from 'lucide-react';

// Rubriques de l'administration : chaque section a sa propre adresse.
// « tab » place la rubrique dans la barre du bas sur téléphone (quatre au plus) ; les autres restent dans le menu.
export const adminSections = [
  { section: 'occupants', path: '/stands', label: 'Stands', Icon: Building2, superOnly: true, tab: true },
  { section: 'users', path: '/acces', label: 'Accès', Icon: Users, superOnly: true },
  { section: 'program', path: '/programme', label: 'Programme', Icon: CalendarDays, superOnly: true },
  { section: 'investor-requests', path: '/investor-desk', label: 'Investor Desk', Icon: BriefcaseBusiness, tab: true },
  { section: 'b2b', path: '/b2b', label: 'B2B', Icon: Handshake, tab: true },
  { section: 'studio', path: '/studio', label: 'Studio', Icon: Video },
  { section: 'challenges', path: '/participants', label: 'Participants', Icon: Trophy, tab: true },
  { section: 'wheel', path: '/roue', label: 'Roue', Icon: Disc3, tab: true },
];

const profileLink = { path: '/profil', label: 'Profil', Icon: CircleUserRound, tab: true };
// Accueil de l'administration : ce qui attend une action et les chiffres du Hub.
const dashboardLink = { path: '/tableau-de-bord', label: 'Tableau de bord', Icon: LayoutDashboard, tab: true };

const roleLinks = {
  'super-admin': [dashboardLink, ...adminSections, { path: '/parametres', label: 'Paramètres', Icon: SlidersHorizontal }, { ...profileLink, tab: false }],
  admin: [dashboardLink, ...adminSections.filter((item) => !item.superOnly), { ...profileLink, tab: false }],
  occupant: [
    { path: '/contacts', label: 'Contacts', Icon: Users, tab: true },
    { path: '/defis', label: 'Défis', Icon: Trophy, tab: true },
    profileLink,
  ],
  animateur: [
    { path: '/scan', label: 'Scan', Icon: ScanLine, tab: true },
    { path: '/remises', label: 'Remises', Icon: Gift, tab: true },
    profileLink,
  ],
};

export const roleLabels = {
  'super-admin': 'Super administrateur',
  admin: 'Administrateur',
  occupant: 'Occupant',
  animateur: 'Animateur',
};

export const isAdminRole = (role) => role === 'super-admin' || role === 'admin';
export const linksForRole = (role) => roleLinks[role] || [];
export const tabsForRole = (role) => linksForRole(role).filter((item) => item.tab).slice(0, 4);
export const homeForRole = (role) => linksForRole(role)[0]?.path || null;

// Rubrique d'administration correspondant à l'adresse, ou null si l'adresse n'en est pas une.
export const adminSectionForPath = (pathname, role) => adminSections
  .filter((item) => role === 'super-admin' || !item.superOnly)
  .find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`))?.section || null;
