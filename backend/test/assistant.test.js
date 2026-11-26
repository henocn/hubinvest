const test = require('node:test');
const assert = require('node:assert/strict');
const env = require('../src/config/env');
const roles = require('../src/shared/roles');
const assistantService = require('../src/modules/assistant/assistant.service');
const dashboardService = require('../src/modules/dashboard/dashboard.service');
const contactService = require('../src/modules/contact/contact.service');
const followUpService = require('../src/modules/follow-up/follow-up.service');
const studioInvitationService = require('../src/modules/studio-invitation/studio-invitation.service');
const b2bNeedService = require('../src/modules/b2b-need/b2b-need.service');
const occupantRepository = require('../src/modules/occupant/occupant.repository');

const manager = { id: 'user-a', occupantId: 'stand-a', firstName: 'Afi', role: roles.OCCUPANT, occupant: { space: 'industrie' } };
const stream = (events) => events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('');

// Les services de l'espace équipe, remplacés par des données de test ; chacun reçoit le compte connecté.
const mockStand = (context) => {
  const seen = [];
  const as = (value) => async (user) => { seen.push(user); return value; };
  context.mock.method(occupantRepository, 'findById', async () => ({ name: 'Zener', slug: 'zener', standLabel: 'Stand 7', logoUrl: '/logo.webp', activity: 'Énergie', gallery: [] }));
  context.mock.method(dashboardService, 'overview', as({ b2b: { openNeeds: 1, pendingProposals: 2 }, challenges: { players: 14, rewardsToHand: 0, rewardsHanded: 3 } }));
  context.mock.method(contactService, 'stats', as({ total: 9, unqualified: 1, byQualification: { A: 3, B: 4, C: 1 } }));
  context.mock.method(followUpService, 'listContacts', as([
    { dueAt: new Date(Date.now() - 3600000), reason: 'Devis promis', doneAt: null, contact: { fullName: 'Koffi Mensah', company: 'Sotra', qualification: 'A', phone: '+22890000000', email: 'koffi@example.org' } },
    { dueAt: new Date(Date.now() - 7200000), reason: 'Déjà faite', doneAt: new Date(), contact: { fullName: 'Ama Doe' } },
  ]));
  context.mock.method(followUpService, 'listB2b', as([]));
  context.mock.method(studioInvitationService, 'list', as([{ guestName: 'Kodjo Agbeko', status: 'booked', scheduledAt: new Date() }]));
  context.mock.method(b2bNeedService, 'list', as([{ title: 'Emballages carton', status: 'open', proposalCount: 2, handledCount: 0 }]));
  return seen;
};

test('l’assistant reconstitue la réponse de Dify et signale une erreur survenue en cours de réponse', () => {
  assert.equal(assistantService.readReply(stream([
    { event: 'agent_message', answer: 'Ouvrez ' },
    { event: 'agent_thought', thought: 'ignoré' },
    { event: 'agent_message', answer: 'Contacts.' },
    { event: 'message_end' },
  ])), 'Ouvrez Contacts.');
  assert.throws(() => assistantService.readReply(stream([{ event: 'message', answer: 'Début' }, { event: 'error', message: 'quota' }])), (error) => error.status === 502);
  assert.throws(() => assistantService.readReply(''), (error) => error.code === 'ASSISTANT_UNAVAILABLE');
});

test('l’assistant n’est pas proposé tant que Dify n’est pas branché', async () => {
  env.assistant = { url: '', key: '', timeout: 1000 };
  assert.equal(assistantService.enabled(), false);
  await assert.rejects(assistantService.ask(manager, { message: 'Bonjour' }), (error) => error.status === 503 && error.code === 'ASSISTANT_NOT_CONFIGURED');
});

test('l’assistant reçoit les données du stand du gérant connecté, sans coordonnées des contacts, et sa clé reste côté serveur', async (context) => {
  const seen = mockStand(context);
  env.assistant = { url: 'https://dify.test/v1', key: 'cle-secrete', timeout: 1000 };
  context.after(() => { env.assistant = { url: '', key: '', timeout: 60000 }; });
  let sent;
  context.mock.method(global, 'fetch', async (url, options) => {
    sent = { url, options, body: JSON.parse(options.body) };
    return { ok: true, text: async () => stream([{ event: 'message', answer: 'Vous avez 1 relance en retard.' }]) };
  });

  const result = await assistantService.ask(manager, { message: 'Qui dois-je relancer ?', history: [{ role: 'user', content: 'Bonjour' }, { role: 'assistant', content: 'Bonjour Afi.' }] });

  assert.deepEqual(result, { answer: 'Vous avez 1 relance en retard.' });
  assert.equal(sent.url, 'https://dify.test/v1/chat-messages');
  assert.equal(sent.options.headers.Authorization, 'Bearer cle-secrete');
  assert.equal(sent.body.query, 'Qui dois-je relancer ?');
  assert.equal(sent.body.user, 'hubinvest-user-a');
  assert.equal(sent.body.inputs.historique, 'Utilisateur : Bonjour\nAssistant : Bonjour Afi.');
  // Le guide joint est celui du compte : un gérant de stand n'y voit pas les rubriques de l'équipe API-ZF.
  assert.match(sent.body.inputs.guide, /Mes contacts/);
  assert.doesNotMatch(sent.body.inputs.guide, /Utilisateurs|Paramètres/);
  // Tous les services ont été interrogés avec le compte connecté : ce sont eux qui limitent les données à son stand.
  assert.ok(seen.length >= 6 && seen.every((user) => user === manager));

  const contexte = JSON.parse(sent.body.inputs.contexte);
  assert.equal(contexte.stand.nom, 'Zener');
  assert.deepEqual(contexte.stand.ficheManquante, ['photo de couverture', 'produits', 'services', 'site web', 'photos de la galerie']);
  assert.deepEqual(contexte.contacts, { total: 9, classeA: 3, classeB: 4, classeC: 1, sansClasse: 1 });
  assert.equal(contexte.relancesContacts.aFaire, 1);
  assert.equal(contexte.relancesContacts.enRetard, 1);
  assert.equal(contexte.relancesContacts.prochaines[0].contact, 'Koffi Mensah');
  assert.equal(contexte.studio.invitations[0].statut, 'créneau réservé');
  assert.equal(contexte.b2b.besoins[0].titre, 'Emballages carton');
  assert.equal(sent.options.body.includes('+22890000000') || sent.options.body.includes('koffi@example.org'), false);
});

test('une panne de Dify donne un message clair au gérant, jamais une erreur brute', async (context) => {
  mockStand(context);
  env.assistant = { url: 'https://dify.test/v1', key: 'cle-secrete', timeout: 1000 };
  context.after(() => { env.assistant = { url: '', key: '', timeout: 60000 }; });
  context.mock.method(global, 'fetch', async () => ({ ok: false, status: 500, text: async () => 'Internal Server Error' }));
  await assert.rejects(assistantService.ask(manager, { message: 'Bonjour' }), (error) => error.status === 502 && error.code === 'ASSISTANT_UNAVAILABLE');
  context.mock.method(global, 'fetch', async () => { throw new Error('ECONNREFUSED'); });
  await assert.rejects(assistantService.ask(manager, { message: 'Bonjour' }), (error) => error.status === 502);
});

const assistantGuide = require('../src/modules/assistant/assistant.guide');

// Repères propres à chaque rubrique du guide : leur présence montre que la rubrique a été remise à l'assistant.
const MARKS = {
  contacts: /Enregistrer le contact/,
  monStand: /Modifier le stand/,
  guichets: /Enregistrer le diagnostic/,
  stands: /Créer le stand/,
  utilisateurs: /Créer un accès/,
  journal: /Journal des actions/,
  parametres: /Modules ouverts au public/,
  remises: /Récompenses remises/,
  b2b: /Fixer le rendez-vous/,
};
const sees = (guide, keys) => Object.fromEntries(Object.keys(MARKS).map((key) => [key, keys.includes(key)]));
const opened = (guide) => Object.fromEntries(Object.entries(MARKS).map(([key, mark]) => [key, mark.test(guide)]));

test('le guide remis à l’assistant ne contient que les rubriques ouvertes au compte connecté', () => {
  assert.deepEqual(opened(assistantGuide.guideFor(manager)), sees(null, ['contacts', 'monStand', 'b2b']));
  assert.deepEqual(opened(assistantGuide.guideFor({ ...manager, occupant: { space: 'apizf' } })), sees(null, ['contacts', 'monStand', 'b2b', 'guichets']));
  assert.deepEqual(opened(assistantGuide.guideFor({ id: 'user-b', role: roles.ADMIN })), sees(null, ['stands', 'b2b', 'guichets']));
  assert.deepEqual(opened(assistantGuide.guideFor({ id: 'user-c', role: roles.SUPER_ADMIN })), sees(null, ['stands', 'b2b', 'guichets', 'utilisateurs', 'journal', 'parametres']));
  assert.deepEqual(opened(assistantGuide.guideFor({ id: 'user-d', role: roles.ANIMATOR })), sees(null, ['remises']));
});

test('un animateur reçoit seulement ce qui le concerne : ni stand, ni contacts, ni relances, ni B2B', async (context) => {
  const seen = mockStand(context);
  context.mock.method(dashboardService, 'overview', async (user) => { seen.push(user); return { todo: { 'live-questions': 2 } }; });
  const animator = { id: 'user-d', firstName: 'Yao', role: roles.ANIMATOR, occupantId: null };
  const contexte = await assistantService.snapshot(animator);
  assert.deepEqual(contexte.aTraiter, { questionsDuPublicATraiter: 2 });
  for (const key of ['stand', 'contacts', 'relancesContacts', 'relancesB2b', 'b2b', 'studio', 'hub', 'guichets']) assert.equal(contexte[key] ?? null, null, key);
  assert.equal(followUpService.listContacts.mock.callCount(), 0);
  assert.equal(b2bNeedService.list.mock.callCount(), 0);
});
