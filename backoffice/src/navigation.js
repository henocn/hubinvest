import { Building2, CalendarDays, Disc3, Gift, Handshake, LayoutDashboard, MessageCircleQuestion, ScanLine, SlidersHorizontal, Trophy, Users } from 'lucide-react';

// Rubriques de l'administration : chaque section a sa propre adresse.
// « tab » place la rubrique dans la barre du bas sur téléphone (quatre au plus) ; les autres restent dans le menu.
export const adminSections = [
  { section: 'occupants', path: '/stands', label: 'Stands', Icon: Building2, superOnly: true, tab: true },
  { section: 'users', path: '/acces', label: 'Accès', Icon: Users, superOnly: true },
  { section: 'program', path: '/programme', label: 'Programme', Icon: CalendarDays, superOnly: true },
  { section: 'b2b', path: '/b2b', label: 'Rencontre B2B', Icon: Handshake, group: 'meetings' },
  // Guichet de l'API-ZF : réservé à son équipe (super administrateurs).
  { section: 'investor-requests', path: '/investor-desk', label: 'Investor Desk', Icon: Handshake, group: 'meetings', superOnly: true },
  { section: 'challenges', path: '/participants', label: 'Défis', Icon: Trophy, group: 'games' },
  { section: 'wheel', path: '/roue', label: 'Roue des opportunités', Icon: Disc3, group: 'games' },
];

// Rubriques réunies sous une seule entrée du menu, avec des onglets dans la page :
// Rencontres (Rencontre B2B, Investor Desk) et Jeux (Défis, Roue des opportunités).
export const sectionGroups = {
  meetings: { label: 'Rencontres', Icon: Handshake },
  games: { label: 'Jeux', Icon: Trophy },
};

// Onglets d'un groupe visibles pour un rôle (l'Investor Desk reste réservé au super administrateur).
export const groupTabs = (group, role) => adminSections.filter((item) => item.group === group && (role === 'super-admin' || !item.superOnly));

// Entrée du menu d'un groupe : mène au premier onglet, additionne leurs pastilles et reste active sur chacun.
const groupLink = (group, sections) => {
  const tabs = sections.filter((item) => item.group === group);
  return { path: tabs[0].path, label: sectionGroups[group].label, Icon: sectionGroups[group].Icon, tab: true, sections: tabs.map((item) => item.section), matches: tabs.map((item) => item.path) };
};

// Entrées du menu : les rubriques, chaque groupe à la place de ses onglets.
const menuSections = (sections) => sections.flatMap((item) => {
  if (!item.group) return [item];
  return item === sections.find((other) => other.group === item.group) ? [groupLink(item.group, sections)] : [];
});

// Pas d'entrée « Profil » dans le menu : le nom et l'avatar en bas du menu mènent au profil.
// Accueil de l'administration : ce qui attend une action et les chiffres du Hub.
const dashboardLink = { path: '/tableau-de-bord', label: 'Tableau de bord', tabLabel: 'Accueil', Icon: LayoutDashboard, tab: true };
// Questions du public pendant les directs, reçues par l'animateur.
// Réglages du site ; un administrateur de stand y gère seulement ses besoins B2B.
const settingsLink = { path: '/parametres', label: 'Paramètres', Icon: SlidersHorizontal };
const questionsLink = { path: '/questions', label: 'Questions', Icon: MessageCircleQuestion, tab: true };

const roleLinks = {
  'super-admin': [dashboardLink, ...menuSections(adminSections), { ...questionsLink, tab: false }, settingsLink],
  admin: [dashboardLink, ...menuSections(adminSections.filter((item) => !item.superOnly)), settingsLink],
  occupant: [
    { path: '/contacts', label: 'Contacts', Icon: Users, tab: true },
    { path: '/defis', label: 'Défis', Icon: Trophy, tab: true },
  ],
  animateur: [
    { path: '/scan', label: 'Scan', Icon: ScanLine, tab: true },
    questionsLink,
    { path: '/remises', label: 'Remises', Icon: Gift, tab: true },
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
