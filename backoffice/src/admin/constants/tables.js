import { formatDate } from '../../lib/excel';
import { challengeStatusLabels, investorStatusLabels, programTypeLabels, roleLabels } from './access';

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

/**
 * Réglages de chaque tableau de l'administration :
 * - sorts : ordres de tri ;
 * - exportName / columns : fichier Excel et ses colonnes.
 */
export const tableSettings = {
  occupants: {
    sorts: [{ value: 'az', label: 'A → Z', compare: byText((item) => item.name) }, ...sorts((item) => item.createdAt, (item) => item.name).slice(0, 2)],
    exportName: 'stands',
    columns: (context) => [
      { header: 'Stand', value: (item) => item.name, width: 30 },
      { header: 'Emplacement', value: (item) => item.standLabel, width: 24 },
      { header: 'Activités', value: (item) => item.activity, width: 60 },
      { header: 'Produits', value: (item) => item.products, width: 40 },
      { header: 'Services', value: (item) => item.services, width: 40 },
      { header: 'Site web', value: (item) => item.website, width: 30 },
      { header: 'Photos', value: (item) => (item.gallery || []).length, width: 10 },
      { header: 'Statut', value: (item) => (item.status === 'active' ? 'Actif' : 'Inactif'), width: 12 },
      { header: 'Contacts enregistrés', value: (item) => context.contactStats?.byOccupant?.[item.id] || 0, width: 20 },
      { header: 'Fiche publique', value: (item) => `${context.publicBaseUrl}/stands/${item.slug}`, width: 45 },
    ],
  },
  users: {
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
  challenges: {
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
