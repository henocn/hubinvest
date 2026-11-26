const env = require('../../config/env');
const AppError = require('../../shared/app-error');
const { MANAGER_ROLES } = require('../../shared/access');
const { accessRole, guideFor, ROLE_LABELS } = require('./assistant.guide');
const dashboardService = require('../dashboard/dashboard.service');
const contactService = require('../contact/contact.service');
const followUpService = require('../follow-up/follow-up.service');
const studioInvitationService = require('../studio-invitation/studio-invitation.service');
const b2bNeedService = require('../b2b-need/b2b-need.service');
const occupantRepository = require('../occupant/occupant.repository');

// Assistant de l'espace équipe : il répond au compte connecté, dans la limite de ce que ce compte voit.
// - Le serveur lit les données avec les droits du compte (les mêmes services que les pages de l'espace équipe) et les
//   joint à la question : l'assistant n'a aucun accès à la base. Un gérant ne voit que son stand, l'équipe API-ZF
//   voit tous les stands, un animateur seulement ce qui le concerne.
// - Le guide joint à la question ne contient que les rubriques ouvertes au compte (assistant.guide.js).
// - L'agent lui-même (consigne, guide, modèle) vit dans Dify ; la clé de Dify ne quitte pas le serveur.
// - Lecture seule : rien ici ne crée, ne modifie ni ne supprime quoi que ce soit.

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
  console.error('Assistant : Dify n’a pas répondu.', detail);
  return new AppError(502, 'ASSISTANT_UNAVAILABLE', 'L’assistant ne répond pas pour le moment. Réessayez dans un instant.');
};

// Réponse de Dify, reçue en flux d'événements : le texte arrive par morceaux, une erreur peut arriver en cours de route.
const readReply = (stream) => {
  let answer = '';
  for (const block of String(stream).split(/\r?\n\r?\n/)) {
    const line = block.split(/\r?\n/).find((item) => item.startsWith('data:'));
    if (!line) continue;
    let event;
    try { event = JSON.parse(line.slice(5)); } catch (error) { continue; }
    if (event.event === 'error') throw failure(event.message || event.code || 'erreur');
    if (event.event === 'message' || event.event === 'agent_message') answer += event.answer || '';
    if (event.event === 'message_replace') answer = event.answer || '';
  }
  answer = answer.trim();
  if (!answer) throw failure('réponse vide');
  return answer;
};

const enabled = () => Boolean(env.assistant.url && env.assistant.key);

// Les derniers échanges, tels que l'écran du gérant les garde : l'assistant suit le fil sans que Dify ait à le mémoriser,
// et les données du stand sont relues à chaque question.
const TURN = 700; // caractères gardés par message : le fil reste court, la question en cours est envoyée entière
const transcript = (history) => history.map((item) => `${item.role === 'assistant' ? 'Assistant' : 'Utilisateur'} : ${item.content.slice(0, TURN)}`).join('\n');

const ask = async (user, { message, history = [] }) => {
  if (!enabled()) throw new AppError(503, 'ASSISTANT_NOT_CONFIGURED', 'L’assistant n’est pas encore disponible.');
  const context = await snapshot(user);
  let response;
  try {
    response = await fetch(`${env.assistant.url}/chat-messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.assistant.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputs: { guide: guideFor(user), contexte: JSON.stringify(context), historique: transcript(history) },
        query: message,
        response_mode: 'streaming',
        user: `hubinvest-${user.id}`,
      }),
      signal: AbortSignal.timeout(env.assistant.timeout),
    });
  } catch (error) {
    throw failure(error.message);
  }
  if (!response.ok) throw failure(`HTTP ${response.status} ${(await response.text().catch(() => '')).slice(0, 300)}`);
  return { answer: readReply(await response.text()) };
};

module.exports = { enabled, ask, snapshot, readReply };
