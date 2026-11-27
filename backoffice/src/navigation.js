import { AlarmClock, BriefcaseBusiness, Building2, CalendarDays, Clapperboard, Disc3, Gift, Handshake, LayoutDashboard, MessageCircleQuestion, ScanLine, ScrollText, SlidersHorizontal, Trophy, Users } from 'lucide-react';

// Rôles : le super administrateur voit tout ; l'administrateur (l'API-ZF) tout sauf Utilisateurs et Paramètres ;
// l'occupant administre son stand (sa fiche, B2B, son carnet de contacts ; pas le Studio ni de scan des joueurs) ; l'animateur scanne et remet.
// Les occupants du Stand API-ZF (« occupant-apizf ») tiennent en plus les Guichets et la Roue des opportunités.
export const isGlobalRole = (role) => role === 'super-admin' || role === 'admin';
export const isOccupantRole = (role) => role === 'occupant' || role === 'occupant-apizf';
export const isManagerRole = (role) => isGlobalRole(role) || isOccupantRole(role);
export const isApizfTeamRole = (role) => isGlobalRole(role) || role === 'occupant-apizf';
// Rôle qui règle le menu et les rubriques : l'occupant du Stand API-ZF a le sien.
export const accessRole = (user) => (user?.role === 'occupant' && user.occupant?.space === 'apizf' ? 'occupant-apizf' : user?.role);

// Rubriques de l'administration : chaque section a sa propre adresse.
// « global » : réservée à l'équipe API-ZF ; « apizf » : à l'équipe API-ZF et aux occupants du Stand API-ZF ; « superOnly » : au super administrateur.
// « tab » place la rubrique dans la barre du bas sur téléphone (quatre au plus) ; les autres restent dans le menu.
export const adminSections = [
  { section: 'occupants', path: '/stands', label: 'Stands', Icon: Building2, global: true, tab: true },
  // Relances : une seule liste de travail, en onglets (Contacts des stands ; Guichets pour l'équipe API-ZF).
  { section: 'follow-ups', path: '/relances', label: 'Relances', Icon: AlarmClock, tab: true },
  { section: 'users', path: '/utilisateurs', label: 'Utilisateurs', Icon: Users, global: true, superOnly: true },
  // Journal des actions : qui a fait quoi et quand.
  { section: 'audit', path: '/journal', label: 'Journal', Icon: ScrollText, global: true, superOnly: true },
  { section: 'program', path: '/programme', label: 'Programme', Icon: CalendarDays, global: true },
  // Studio : invitations personnelles, créneaux, livraison des capsules ; réservé à l'équipe API-ZF.
  { section: 'studio', path: '/studio', label: 'Studio', Icon: Clapperboard, global: true },
  // Rencontres B2B : les demandes reçues (les besoins publiés se gèrent dans Mon stand ou la fiche du stand).
  { section: 'b2b', path: '/b2b', label: 'Rencontres B2B', Icon: Handshake, tab: true },
  // Guichets du Stand API-ZF et registre unique des contacts : l'équipe API-ZF et les occupants du Stand API-ZF.
  { section: 'investor-requests', path: '/guichets', label: 'Guichets', Icon: BriefcaseBusiness, apizf: true },
  // Jeux et défis (tous les joueurs, remise des récompenses et des lots) : l'équipe API-ZF et les occupants du Stand API-ZF,
  // qui remettent quand l'animateur n'est pas là. Les passages se valident par le QR du stand : pas de scan par l'occupant.
  { section: 'challenges', path: '/participants', label: 'Défi de passage', Icon: Trophy, group: 'games', apizf: true },
  { section: 'wheel', path: '/roue', label: 'Roue des opportunités', Icon: Disc3, group: 'games', apizf: true },
];

// Rubriques réunies sous une seule entrée du menu, avec des onglets dans la page.
export const sectionGroups = {
  games: { label: 'Jeux et défis', Icon: Trophy },
};

const allowed = (role) => (item) => (!item.global || isGlobalRole(role)) && (!item.apizf || isApizfTeamRole(role)) && (!item.superOnly || role === 'super-admin');

// Onglets d'un groupe visibles pour un rôle.
export const groupTabs = (group, role) => adminSections.filter((item) => item.group === group && allowed(role)(item));

// Entrée du menu d'un groupe : mène au premier onglet, additionne leurs pastilles et reste active sur chacun.
// Un groupe réduit à un onglet prend son nom (ex. « Roue des opportunités » pour un occupant du Stand API-ZF).
const groupLink = (group, sections) => {
  const tabs = sections.filter((item) => item.group === group);
  const { label, Icon } = tabs.length === 1 ? tabs[0] : sectionGroups[group];
  return { path: tabs[0].path, label, Icon, tab: true, sections: tabs.map((item) => item.section), matches: tabs.map((item) => item.path) };
};

// Entrées du menu : les rubriques permises au rôle, chaque groupe à la place de ses onglets.
const menuSections = (role) => {
  const sections = adminSections.filter((item) => !['users', 'audit'].includes(item.section) && allowed(role)(item));
  return sections.flatMap((item) => {
    if (!item.group) return [item];
    return item === sections.find((other) => other.group === item.group) ? [groupLink(item.group, sections)] : [];
  });
};

// Pas d'entrée « Profil » dans le menu : le nom et l'avatar en bas du menu mènent au profil.
// Accueil de l'administration : ce qui attend une action et les chiffres.
const dashboardLink = { path: '/tableau-de-bord', label: 'Tableau de bord', tabLabel: 'Accueil', Icon: LayoutDashboard, tab: true };
const settingsLink = { path: '/parametres', label: 'Paramètres', Icon: SlidersHorizontal };
// Questions du public pendant les directs.
// La pastille compte les questions pas encore traitées (ni posées ni écartées).
const questionsLink = { path: '/questions', label: 'Questions', Icon: MessageCircleQuestion, tab: true, section: 'live-questions' };
const usersLink = adminSections.find((item) => item.section === 'users');
const auditLink = adminSections.find((item) => item.section === 'audit');

const occupantLinks = (role) => [
  dashboardLink,
  { path: '/mon-stand', label: 'Mon stand', Icon: Building2 },
  { path: '/contacts', label: 'Mes contacts', Icon: Users, tab: true },
  ...menuSections(role),
];

const roleLinks = {
  // Utilisateurs, Journal puis Paramètres, en bas du menu.
  'super-admin': [dashboardLink, ...menuSections('super-admin'), { ...questionsLink, tab: false }, usersLink, auditLink, settingsLink],
  admin: [dashboardLink, ...menuSections('admin'), { ...questionsLink, tab: false }],
  // L'occupant : son stand (sa fiche, jamais la liste des stands), son carnet, puis ce qu'il administre.
  occupant: occupantLinks('occupant'),
  'occupant-apizf': occupantLinks('occupant-apizf'),
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

export const linksForRole = (role) => roleLinks[role] || [];
export const tabsForRole = (role) => linksForRole(role).filter((item) => item.tab).slice(0, 4);
export const homeForRole = (role) => linksForRole(role)[0]?.path || null;

// Rubrique d'administration correspondant à l'adresse, ou null si l'adresse n'en est pas une (ou n'est pas permise).
export const adminSectionForPath = (pathname, role) => adminSections
  .filter(allowed(role))
  .find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`))?.section || null;
