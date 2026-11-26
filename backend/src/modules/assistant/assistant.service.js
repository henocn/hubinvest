const env = require('../../config/env');
const AppError = require('../../shared/app-error');
const { MANAGER_ROLES } = require('../../shared/access');
const { accessRole, guideFor, ROLE_LABELS } = require('./assistant.guide');
const { toolsFor, definitions } = require('./assistant.tools');
const INSTRUCTIONS = require('./assistant.instructions');
const model = require('./assistant.model');
const dashboardService = require('../dashboard/dashboard.service');
const contactService = require('../contact/contact.service');
const followUpService = require('../follow-up/follow-up.service');
const studioInvitationService = require('../studio-invitation/studio-invitation.service');
const b2bNeedService = require('../b2b-need/b2b-need.service');
const occupantRepository = require('../occupant/occupant.repository');

// Agent de l'espace équipe : il travaille pour le compte connecté, dans la limite de ce que ce compte peut faire.
// - Le modèle (API Anthropic) reçoit la consigne, le guide des seules rubriques ouvertes au compte (assistant.guide.js),
//   un résumé de ses données lu avec ses droits, et les outils de son rôle (assistant.tools.js).
// - Chaque outil appelle l'API de HubInvest avec la session du compte : les routes appliquent droits et validations.
//   Les lectures s'exécutent ; les créations et modifications attendent la confirmation de la personne ;
//   aucune suppression n'est possible (assistant.actions.js).
// - La clé de l'API Anthropic ne quitte pas le serveur.

const LIST = 10; // lignes au plus par liste jointe à la question
// Ce qui attend une action, tel que les pastilles du menu le comptent.
const TODO_LABELS = {
  'follow-ups': 'relancesAFaireAujourdhuiOuEnRetard',
  b2b: 'demandesB2bATraiter',
  'investor-requests': 'contactsDesGuichetsATraiter',
  challenges: 'recompensesDuDefiARemettre',
  wheel: 'lotsDeLaRoueARemettre',
  'live-questions': 'questionsDuPublicATraiter',
};
const STUDIO_STATUS = { invited: 'invité, créneau pas encore choisi', booked: 'créneau réservé', declined: 'a décliné', cancelled: 'annulé', delivered: 'capsule livrée' };
const SHEET_FIELDS = [
  ['logoUrl', 'logo'],
  ['coverImageUrl', 'photo de couverture'],
  ['activity', 'activité'],
  ['products', 'produits'],
  ['services', 'services'],
  ['website', 'site web'],
  ['gallery', 'photos de la galerie'],
];

const plain = (value) => (value?.toJSON ? value.toJSON() : value);
const filled = (value) => (Array.isArray(value) ? value.length > 0 : Boolean(value && String(value).trim()));
const moment = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
const when = (date) => (date ? moment.format(new Date(date)) : null);
// Une partie des données qui manque (compte sans stand, service indisponible) ne doit pas empêcher de répondre.
const optional = (promise) => Promise.resolve(promise).catch(() => null);

const standSheet = (stand) => ({
  nom: stand.name,
  numero: stand.standLabel || null,
  pagePublique: `${env.appUrls.public}/stands/${stand.slug}`,
  ficheRemplie: SHEET_FIELDS.filter(([key]) => filled(stand[key])).map(([, label]) => label),
  ficheManquante: SHEET_FIELDS.filter(([key]) => !filled(stand[key])).map(([, label]) => label),
});

const pendingFollowUps = (items, describe) => {
  const pending = (items || []).map(plain).filter((item) => !item.doneAt);
  const now = Date.now();
  return {
    aFaire: pending.length,
    enRetard: pending.filter((item) => new Date(item.dueAt).getTime() < now).length,
    prochaines: pending.slice(0, LIST).map((item) => ({ ...describe(item), echeance: when(item.dueAt), enRetard: new Date(item.dueAt).getTime() < now, motif: item.reason || null })),
  };
};

const todo = (counts) => Object.fromEntries(Object.entries(counts || {}).filter(([key]) => TODO_LABELS[key]).map(([key, value]) => [TODO_LABELS[key], value]));

// Ce que le compte voit dans son espace, résumé pour l'assistant. Ni téléphone ni e-mail des contacts.
// Les services appliquent les droits : un gérant reçoit son stand, l'équipe API-ZF tous les stands. Un animateur
// n'a ni stand ni carnet : seules ses questions du public à traiter sont lues.
const snapshot = async (user) => {
  const manager = MANAGER_ROLES.includes(user.role);
  const [stand, overview, contacts, contactFollowUps, b2bFollowUps, invitations, needs] = await Promise.all([
    user.occupantId ? optional(occupantRepository.findById(user.occupantId)) : null,
    optional(dashboardService.overview(user)),
    user.occupantId ? optional(contactService.stats(user)) : null,
    manager ? optional(followUpService.listContacts(user)) : null,
    manager ? optional(followUpService.listB2b(user)) : null,
    manager ? optional(studioInvitationService.list(user)) : null,
    manager ? optional(b2bNeedService.list(user)) : null,
  ]);

  return {
    maintenant: `${when(new Date())} (heure de Lomé)`,
    compte: { prenom: user.firstName, role: ROLE_LABELS[accessRole(user)] || user.role, perimetre: user.occupantId ? 'son stand uniquement' : manager ? 'tous les stands du Hub' : 'ses rubriques uniquement' },
    aTraiter: todo(overview?.todo),
    stand: stand ? standSheet(plain(stand)) : null,
    // Réservé à l'équipe API-ZF par le tableau de bord lui-même : absents pour un gérant de stand.
    hub: overview?.stands && { standsActifs: overview.stands.active, contactsDesStands: overview.contacts?.total, contactsDuJour: overview.contacts?.today },
    guichets: overview?.investor && { aTraiter: overview.investor.new, enCours: overview.investor.inProgress, total: overview.investor.total, relancesEnRetard: overview.investor.overdue, relancesDuJour: overview.investor.dueToday, diagnostics: overview.investor.diagnosed, engagementsEnRetard: overview.investor.commitmentsOverdue },
    roue: overview?.wheel && { partiesJouees: overview.wheel.played, partiesDuJour: overview.wheel.playedToday, lotsARemettre: overview.wheel.prizesToHand },
    contacts: contacts && { total: contacts.total, classeA: contacts.byQualification.A, classeB: contacts.byQualification.B, classeC: contacts.byQualification.C, sansClasse: contacts.unqualified },
    relancesContacts: contactFollowUps && pendingFollowUps(contactFollowUps, (item) => ({ contact: item.contact?.fullName, entreprise: item.contact?.company || null, classe: item.contact?.qualification || null })),
    relancesB2b: b2bFollowUps && pendingFollowUps(b2bFollowUps, (item) => ({ contact: item.proposal?.fullName || null, besoin: item.proposal?.need?.title || null })),
    b2b: needs && {
      besoinsOuverts: overview?.b2b?.openNeeds ?? null,
      propositionsATraiter: overview?.b2b?.pendingProposals ?? null,
      besoins: needs.map(plain).slice(0, LIST).map((need) => ({ titre: need.title, statut: need.status === 'open' ? 'ouvert' : 'fermé', propositionsRecues: need.proposalCount ?? null, propositionsTraitees: need.handledCount ?? null })),
    },
    studio: invitations && {
      invitations: invitations.map(plain).slice(0, LIST).map((item) => ({ invite: item.guestName, statut: STUDIO_STATUS[item.status] || item.status, creneau: when(item.scheduledAt) })),
    },
    defis: overview?.challenges && { joueursPassesParLeStand: overview.challenges.players, recompensesARemettre: overview.challenges.rewardsToHand, recompensesRemises: overview.challenges.rewardsHanded },
  };
};

const failure = (detail) => {
  // Trace pour le diagnostic (journal du serveur) ; le compte connecté ne reçoit qu'un message simple.
  console.error('Assistant : le modèle n’a pas répondu.', detail);
  return new AppError(502, 'ASSISTANT_UNAVAILABLE', 'L’assistant ne répond pas pour le moment. Réessayez dans un instant.');
};

const enabled = () => Boolean(env.assistant.apiKey);

const TURN = 1500; // caractères gardés par message du fil ; la question en cours est envoyée entière
const MAX_STEPS = 8; // appels au modèle au plus par question (chaque appel peut utiliser plusieurs outils)
const RESULT_LIMIT = 12_000; // caractères au plus par résultat d'outil
// Champs jamais utiles à l'agent : jetons, images, mots de passe.
const DROPPED = new Set(['token', 'passwordHash', 'password', 'gallery', 'coverImageUrl', 'logoUrl', 'updatedAt']);

// Résultat d'un outil, allégé : sans champs vides ni champs inutiles, textes et listes raccourcis.
const compact = (value, depth = 0) => {
  if (Array.isArray(value)) {
    const items = value.slice(0, 30).map((item) => compact(item, depth + 1));
    return value.length > 30 ? [...items, `… et ${value.length - 30} de plus`] : items;
  }
  if (value && typeof value === 'object') {
    if (depth > 5) return '…';
    return Object.fromEntries(Object.entries(value)
      .filter(([key, item]) => !DROPPED.has(key) && item !== null && item !== undefined && item !== '' && !(Array.isArray(item) && !item.length))
      .map(([key, item]) => [key, compact(item, depth + 1)]));
  }
  return typeof value === 'string' && value.length > 600 ? `${value.slice(0, 600)}…` : value;
};
const serialize = (value) => {
  const json = JSON.stringify(compact(value ?? null));
  return json.length > RESULT_LIMIT ? `${json.slice(0, RESULT_LIMIT)}… (résultat tronqué : précisez la recherche)` : json;
};

// Le fil gardé par la fenêtre : il commence par la personne, et les messages d'un même auteur sont réunis.
const conversation = (history) => history.reduce((turns, item) => {
  const content = item.content.slice(0, TURN);
  if (!turns.length && item.role !== 'user') return turns;
  const last = turns[turns.length - 1];
  if (last?.role === item.role) last.content = `${last.content}\n\n${content}`;
  else turns.push({ role: item.role, content });
  return turns;
}, []);

// Un outil demandé par le modèle : lecture exécutée, écriture préparée pour confirmation.
const runTool = async (block, user, session, actions) => {
  const tool = actions.allowedTool(user, block.name);
  if (!tool) return { type: 'tool_result', tool_use_id: block.id, is_error: true, content: 'Cet outil n’est pas ouvert à ce compte.' };
  try {
    if (!tool.write) return { type: 'tool_result', tool_use_id: block.id, content: serialize(await actions.read(tool, block.input || {}, user, session)) };
    const action = await actions.prepare(tool, block.input || {}, user, session);
    session.pending.push(action);
    return { type: 'tool_result', tool_use_id: block.id, content: `Action préparée, en attente de la confirmation de la personne : ${action.summary}.` };
  } catch (error) {
    return { type: 'tool_result', tool_use_id: block.id, is_error: true, content: error.message || 'Erreur.' };
  }
};

// Une question : le modèle utilise ses outils autant que nécessaire, puis répond.
// Renvoie la réponse et les actions préparées, que la personne confirmera.
const ask = async (user, { message, history = [] }, session) => {
  if (!enabled()) throw new AppError(503, 'ASSISTANT_NOT_CONFIGURED', 'L’assistant n’est pas encore disponible.');
  const actions = require('./assistant.actions');
  const tools = toolsFor(accessRole(user));
  const context = await snapshot(user);
  // Consigne et guide du rôle : identiques d'une question à l'autre pour ce rôle, gardés en cache.
  const system = [{ type: 'text', text: `${INSTRUCTIONS}\n\n# Guide de l'espace équipe pour ce compte\n\n${guideFor(user)}`, cache_control: { type: 'ephemeral' } }];
  const messages = [
    ...conversation(history),
    { role: 'user', content: `<donnees_du_compte>\n${JSON.stringify(context)}\n</donnees_du_compte>\n\n${message}` },
  ];
  const state = { ...session, pending: [] };

  for (let step = 0; step < MAX_STEPS; step += 1) {
    let response;
    try {
      response = await model.create({ model: env.assistant.model, max_tokens: 2000, system, tools: definitions(tools), messages, output_config: { effort: env.assistant.effort } });
    } catch (error) {
      throw failure(error.message);
    }
    const uses = response.content.filter((block) => block.type === 'tool_use');
    const answer = response.content.filter((block) => block.type === 'text').map((block) => block.text).join('\n').trim();
    if (response.stop_reason === 'refusal') return { answer: 'Je ne peux pas traiter cette demande.', actions: state.pending };
    if (response.stop_reason !== 'tool_use' || !uses.length) {
      if (!answer && !state.pending.length) throw failure(`réponse vide (${response.stop_reason})`);
      return { answer: answer || 'Vérifiez puis confirmez :', actions: state.pending };
    }
    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: await Promise.all(uses.map((block) => runTool(block, user, state, actions))) });
  }
  return { answer: state.pending.length ? 'Vérifiez puis confirmez :' : 'Je n’ai pas pu aller au bout de cette demande. Pouvez-vous la préciser ?', actions: state.pending };
};

// La personne confirme une action préparée.
const confirm = (user, token, session) => require('./assistant.actions').confirm(user, token, session);

module.exports = { enabled, ask, confirm, snapshot, compact, conversation };
