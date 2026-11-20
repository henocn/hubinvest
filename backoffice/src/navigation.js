import { Building2, CalendarDays, CircleUserRound, Disc3, Gift, Handshake, LayoutDashboard, MessageCircleQuestion, ScanLine, SlidersHorizontal, Trophy, Users } from 'lucide-react';

// Rubriques de l'administration : chaque section a sa propre adresse.
// « tab » place la rubrique dans la barre du bas sur téléphone (quatre au plus) ; les autres restent dans le menu.
export const adminSections = [
  { section: 'occupants', path: '/stands', label: 'Stands', Icon: Building2, superOnly: true, tab: true },
  { section: 'users', path: '/acces', label: 'Accès', Icon: Users, superOnly: true },
  { section: 'program', path: '/programme', label: 'Programme', Icon: CalendarDays, superOnly: true },
  { section: 'b2b', path: '/b2b', label: 'Rencontre B2B', Icon: Handshake, group: 'meetings' },
  // Guichet de l'API-ZF : réservé à son équipe (super administrateurs).
  { section: 'investor-requests', path: '/investor-desk', label: 'Investor Desk', Icon: Handshake, group: 'meetings', superOnly: true },
  { section: 'challenges', path: '/participants', label: 'Participants', Icon: Trophy, tab: true },
  { section: 'wheel', path: '/roue', label: 'Roue', Icon: Disc3, tab: true },
];

// Rencontres : B2B et Investor Desk réunis sous une seule entrée du menu, avec deux onglets dans la page.
export const meetingTabs = adminSections.filter((item) => item.group === 'meetings');
const meetingsLink = { path: '/b2b', label: 'Rencontres', Icon: Handshake, tab: true, sections: meetingTabs.map((item) => item.section), matches: meetingTabs.map((item) => item.path) };

// Entrées du menu : les rubriques, avec les Rencontres à la place de leurs deux onglets.
const menuSections = (sections) => sections.flatMap((item) => {
  if (item.group !== 'meetings') return [item];
  return item === sections.find((other) => other.group === 'meetings') ? [meetingsLink] : [];
});

const profileLink = { path: '/profil', label: 'Profil', Icon: CircleUserRound, tab: true };
// Accueil de l'administration : ce qui attend une action et les chiffres du Hub.
const dashboardLink = { path: '/tableau-de-bord', label: 'Tableau de bord', tabLabel: 'Accueil', Icon: LayoutDashboard, tab: true };
// Questions du public pendant les directs, reçues par l'animateur.
// Réglages du site ; un administrateur de stand y gère seulement ses besoins B2B.
const settingsLink = { path: '/parametres', label: 'Paramètres', Icon: SlidersHorizontal };
const questionsLink = { path: '/questions', label: 'Questions', Icon: MessageCircleQuestion, tab: true };

const roleLinks = {
  'super-admin': [dashboardLink, ...menuSections(adminSections), { ...questionsLink, tab: false }, settingsLink, { ...profileLink, tab: false }],
  admin: [dashboardLink, ...menuSections(adminSections.filter((item) => !item.superOnly)), settingsLink, { ...profileLink, tab: false }],
  occupant: [
    { path: '/contacts', label: 'Contacts', Icon: Users, tab: true },
    { path: '/defis', label: 'Défis', Icon: Trophy, tab: true },
    profileLink,
  ],
  animateur: [
    { path: '/scan', label: 'Scan', Icon: ScanLine, tab: true },
    questionsLink,
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
