const { Op } = require('sequelize');
const { AuditLog } = require('../../models');

// Journal des actions de l'espace équipe : chaque modification faite par un compte connecté (ajout, modification,
// suppression, envoi…) et chaque connexion. On garde qui, quand, la rubrique, l'action et l'élément concerné (son nom
// quand la réponse le donne) ; jamais le contenu saisi, les mots de passe ou les codes.

// Rubrique d'après le début de l'adresse de l'API.
const SECTIONS = {
  occupants: 'Stands',
  users: 'Utilisateurs',
  contacts: 'Contacts',
  'investor-requests': 'Guichets',
  'b2b-needs': 'Besoins B2B',
  'b2b-proposals': 'Rencontres B2B',
  'studio-invitations': 'Studio',
  'challenge-passports': 'Défis',
  'challenge-passages': 'Défis',
  'program-events': 'Programme',
  wheel: 'Roue',
  settings: 'Paramètres',
  'live-questions': 'Questions',
};

// Actions nommées par le dernier mot de l'adresse.
const NAMED_ACTIONS = {
  cancel: 'Annulation',
  schedule: 'Créneau fixé',
  deliver: 'Capsule livrée',
  resend: 'Invitation renvoyée',
  claim: 'Lot remis',
  redeem: 'Récompense remise',
  resolution: 'Réponse à l’engagement',
  codes: 'Code de jeu créé',
  decision: 'Décision',
};

// Éléments rattachés à une fiche (guichets, B2B…).
const SUB_RESOURCES = {
  'follow-ups': 'relance',
  meetings: 'rendez-vous',
  diagnosis: 'diagnostic',
  difficulty: 'fiche des difficultés',
  logo: 'logo',
  cover: 'couverture',
  gallery: 'photos',
  segments: 'case de la roue',
  plays: 'partie',
};

const VERBS = { POST: 'Ajout', PUT: 'Modification', PATCH: 'Modification', DELETE: 'Suppression' };
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$|^\d+$/i;

// Rubrique et action lisibles pour une requête de l'API ; null si elle n'a pas à figurer au journal.
const describe = (method, path) => {
  const [, api, module, ...rest] = path.split('?')[0].split('/');
  if (api !== 'api' || !SECTIONS[module] || !VERBS[method]) return null;
  const words = rest.filter((part) => part && !ID.test(part));
  if (module === 'challenge-passages' && method === 'POST') return { section: SECTIONS[module], action: 'Passage validé' };
  const last = words.at(-1);
  if (last && NAMED_ACTIONS[last]) return { section: SECTIONS[module], action: NAMED_ACTIONS[last] };
  const sub = [...words].reverse().find((part) => SUB_RESOURCES[part]);
  return { section: SECTIONS[module], action: sub ? `${VERBS[method]} · ${SUB_RESOURCES[sub]}` : VERBS[method] };
};

// Nom lisible de l'élément, pris dans la réponse quand elle en donne un.
const targetOf = (data) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const value = data.fullName || data.guestName || data.name || data.title || data.displayName || data.email
    || [data.firstName, data.lastName].filter(Boolean).join(' ') || data.code || null;
  return value ? String(value).slice(0, 200) : null;
};

const record = (values) => AuditLog.create(values).catch((error) => console.error('Journal des actions non enregistré.', error.message));

const fullName = (user) => [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Compte';

// Ligne du journal pour une requête réussie d'un compte connecté.
const recordRequest = ({ user, method, path, ip, data }) => {
  const described = describe(method, path);
  if (!described || !user) return null;
  return record({
    userId: user.id,
    userName: fullName(user),
    userRole: user.role,
    ...described,
    target: targetOf(data),
    method,
    path: path.split('?')[0].slice(0, 255),
    ip: ip || null,
  });
};

const recordLogin = (user, ip) => record({
  userId: user.id,
  userName: fullName(user),
  userRole: user.role,
  section: 'Compte',
  action: 'Connexion',
  target: null,
  method: 'POST',
  path: '/api/auth/login',
  ip: ip || null,
});

// Les actions les plus récentes d'abord ; recherche sur le compte, la rubrique, l'action ou l'élément.
const list = async ({ search, limit = 1000, offset = 0 }) => {
  const where = search
    ? { [Op.or]: ['userName', 'section', 'action', 'target'].map((key) => ({ [key]: { [Op.iLike]: `%${search}%` } })) }
    : {};
  const { rows, count } = await AuditLog.findAndCountAll({ where, order: [['createdAt', 'DESC']], limit, offset });
  return { items: rows, total: count };
};

module.exports = { describe, targetOf, recordRequest, recordLogin, list };
