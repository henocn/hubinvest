import { formatDate } from '../../lib/excel';
import { challengeStatusLabels, investorStatusLabels, programTypeLabels, roleLabels, studioStatusLabels } from './access';

const fullName = (person) => (person ? [person.firstName, person.lastName].filter(Boolean).join(' ') : '');
const byText = (value) => (a, b) => String(value(a) || '').localeCompare(String(value(b) || ''), 'fr', { sensitivity: 'base' });
const byDate = (value, direction) => (a, b) => direction * ((new Date(value(a) || 0)).getTime() - (new Date(value(b) || 0)).getTime());
const passageList = (passport) => (passport.passages || [])
  .map((passage) => `${passage.occupant?.name || ''}${passage.classification ? ` (${passage.classification})` : ''}`)
  .join(', ');

// Tris proposés partout : le plus récent d'abord par défaut, puis plus ancien et A-Z.
const sorts = (dateOf, nameOf) => [
  { value: 'recent', label: 'Plus récent', compare: byDate(dateOf, -1) },
  { value: 'oldest', label: 'Plus ancien', compare: byDate(dateOf, 1) },
  { value: 'az', label: 'A → Z', compare: byText(nameOf) },
];

const options = (labels) => Object.entries(labels).map(([value, label]) => ({ value, label }));

/**
 * Réglages de chaque tableau de l'administration :
 * - filters : filtre principal (statut, type…) ;
 * - sorts : ordres de tri ;
 * - exportName / columns : fichier Excel et ses colonnes.
 */
export const tableSettings = {
  occupants: {
    filterLabel: 'Statut',
    filters: [{ value: 'active', label: 'Actifs' }, { value: 'inactive', label: 'Inactifs' }],
    filterOf: (item) => item.status,
    sorts: [{ value: 'az', label: 'A → Z', compare: byText((item) => item.name) }, ...sorts((item) => item.createdAt, (item) => item.name).slice(0, 2)],
    exportName: 'stands',
    columns: (context) => [
      { header: 'Stand', value: (item) => item.name, width: 30 },
      { header: 'Emplacement', value: (item) => item.standLabel, width: 24 },
      { header: 'Activité', value: (item) => item.activity, width: 60 },
      { header: 'Statut', value: (item) => (item.status === 'active' ? 'Actif' : 'Inactif'), width: 12 },
      { header: 'Contacts enregistrés', value: (item) => context.contactStats?.byOccupant?.[item.id] || 0, width: 20 },
      { header: 'Fiche publique', value: (item) => `${context.publicBaseUrl}/stands/${item.slug}`, width: 45 },
    ],
  },
  users: {
    filterLabel: 'Rôle',
    filters: options(roleLabels),
    filterOf: (item) => item.role,
    sorts: [{ value: 'az', label: 'A → Z', compare: byText((item) => fullName(item)) }, ...sorts((item) => item.createdAt, fullName).slice(0, 2)],
    exportName: 'acces',
    columns: () => [
      { header: 'Nom', value: (item) => fullName(item), width: 28 },
      { header: 'E-mail', value: (item) => item.email, width: 32 },
      { header: 'Rôle', value: (item) => roleLabels[item.role] || item.role, width: 22 },
      { header: 'Stand', value: (item) => item.occupant?.name, width: 28 },
      { header: 'Actif', value: (item) => Boolean(item.isActive), width: 10 },
    ],
  },
  program: {
    filterLabel: 'Type',
    filters: options(programTypeLabels),
    filterOf: (item) => item.type,
    sorts: [
      { value: 'oldest', label: 'Chronologique', compare: byDate((item) => item.startsAt, 1) },
      { value: 'recent', label: 'Plus tard d’abord', compare: byDate((item) => item.startsAt, -1) },
      { value: 'az', label: 'A → Z', compare: byText((item) => item.title || item.occupant?.name) },
    ],
    exportName: 'programme',
    columns: () => [
      { header: 'Début', value: (item) => formatDate(item.startsAt), width: 18 },
      { header: 'Fin', value: (item) => formatDate(item.endsAt), width: 18 },
      { header: 'Type', value: (item) => programTypeLabels[item.type] || item.type, width: 18 },
      { header: 'Titre', value: (item) => item.title || item.occupant?.name, width: 45 },
      { header: 'Stand', value: (item) => item.occupant?.name, width: 28 },
      { header: 'Lieu', value: (item) => item.location || item.occupant?.standLabel, width: 24 },
    ],
  },
  'investor-requests': {
    filterLabel: 'Statut',
    filters: options(investorStatusLabels),
    filterOf: (item) => item.status,
    sorts: sorts((item) => item.createdAt, (item) => item.fullName),
    exportName: 'investor-desk',
    columns: () => [
      { header: 'Reçue le', value: (item) => formatDate(item.createdAt), width: 18 },
      { header: 'Nom', value: (item) => item.fullName, width: 26 },
      { header: 'E-mail', value: (item) => item.email, width: 30 },
      { header: 'Téléphone', value: (item) => item.phone, width: 18 },
      { header: 'Stand', value: (item) => item.occupant?.name, width: 26 },
      { header: 'Projet', value: (item) => item.projectSummary, width: 60 },
      { header: 'Statut', value: (item) => investorStatusLabels[item.status] || item.status, width: 14 },
      { header: 'Responsable', value: (item) => fullName(item.assignedTo), width: 24 },
      { header: 'Prochaine action', value: (item) => item.nextAction, width: 36 },
      { header: 'Accord API-ZF', value: (item) => Boolean(item.consentApizf), width: 14 },
    ],
  },
  b2b: {
    filterLabel: 'Statut',
    filters: [{ value: 'open', label: 'Ouverts' }, { value: 'closed', label: 'Fermés' }],
    filterOf: (item) => item.status,
    sorts: sorts((item) => item.createdAt, (item) => item.title),
    exportName: 'besoins-b2b',
    columns: () => [
      { header: 'Publié le', value: (item) => formatDate(item.createdAt), width: 18 },
      { header: 'Besoin', value: (item) => item.title, width: 40 },
      { header: 'Description', value: (item) => item.description, width: 60 },
      { header: 'Stand', value: (item) => item.occupant?.name, width: 26 },
      { header: 'Statut', value: (item) => (item.status === 'open' ? 'Ouvert' : 'Fermé'), width: 12 },
      { header: 'Publié par', value: (item) => fullName(item.createdBy), width: 24 },
    ],
  },
  studio: {
    filterLabel: 'Réponse',
    filters: options(studioStatusLabels),
    filterOf: (item) => item.status,
    sorts: [
      { value: 'oldest', label: 'Chronologique', compare: byDate((item) => item.scheduledAt, 1) },
      { value: 'recent', label: 'Plus tard d’abord', compare: byDate((item) => item.scheduledAt, -1) },
      { value: 'az', label: 'A → Z', compare: byText((item) => item.guestName) },
    ],
    exportName: 'studio',
    columns: (context) => [
      { header: 'Date', value: (item) => formatDate(item.scheduledAt), width: 18 },
      { header: 'Invité', value: (item) => item.guestName, width: 28 },
      { header: 'Sujet', value: (item) => item.subject, width: 45 },
      { header: 'Stand', value: (item) => item.occupant?.name, width: 26 },
      { header: 'Réponse', value: (item) => studioStatusLabels[item.status] || item.status, width: 14 },
      { header: 'Répondu le', value: (item) => formatDate(item.respondedAt), width: 18 },
      { header: 'Lien de l’invité', value: (item) => `${context.publicBaseUrl}/studio/${item.token}`, width: 50 },
    ],
  },
  challenges: {
    filterLabel: 'Parcours',
    filters: options(challengeStatusLabels),
    filterOf: (item) => item.status,
    sorts: [...sorts((item) => item.createdAt, (item) => item.displayName), { value: 'scans', label: 'Plus de stands', compare: (a, b) => (b.passageCount || 0) - (a.passageCount || 0) }],
    exportName: 'participants',
    columns: () => [
      { header: 'Inscrit le', value: (item) => formatDate(item.createdAt), width: 18 },
      { header: 'Participant', value: (item) => item.displayName, width: 28 },
      { header: 'E-mail', value: (item) => item.email, width: 30 },
      { header: 'Téléphone', value: (item) => item.phone || item.contact, width: 18 },
      { header: 'Code', value: (item) => item.code, width: 10 },
      { header: 'Stands validés', value: (item) => item.passageCount || 0, width: 15 },
      { header: 'Stands (classement)', value: passageList, width: 60 },
      { header: 'Parcours', value: (item) => challengeStatusLabels[item.status] || item.status, width: 16 },
      { header: 'Récompense remise le', value: (item) => formatDate(item.redeemedAt), width: 20 },
    ],
  },
  wheel: {
    filterLabel: 'Case',
    filters: [{ value: 'prize', label: 'Lots' }, { value: 'lose', label: 'Cases perdantes' }, { value: 'hidden', label: 'Masquées' }],
    filterOf: (item, value) => (value === 'hidden' ? !item.isActive : item.kind === value),
    sorts: [
      { value: 'az', label: 'A → Z', compare: byText((item) => item.label) },
      { value: 'remaining', label: 'Moins de stock', compare: (a, b) => (a.remaining ?? Infinity) - (b.remaining ?? Infinity) },
    ],
    // L'export de la roue donne toutes les parties jouées (gagnants compris), pas seulement les cases.
    exportName: 'roue-parties',
    columns: () => [
      { header: 'Jouée le', value: (item) => formatDate(item.usedAt), width: 18 },
      { header: 'Code', value: (item) => item.code, width: 10 },
      { header: 'Joueur', value: (item) => item.player?.displayName, width: 28 },
      { header: 'E-mail', value: (item) => item.player?.email, width: 30 },
      { header: 'Téléphone', value: (item) => item.player?.phone, width: 18 },
      { header: 'Résultat', value: (item) => item.result?.label, width: 30 },
      { header: 'Gagné', value: (item) => item.result?.kind === 'prize', width: 10 },
      { header: 'Partenaire', value: (item) => item.result?.sponsor, width: 24 },
      { header: 'Code délivré par', value: (item) => fullName(item.createdBy), width: 24 },
      { header: 'Lot remis le', value: (item) => formatDate(item.claimedAt), width: 18 },
      { header: 'Remis par', value: (item) => fullName(item.claimedBy), width: 24 },
    ],
  },
};
