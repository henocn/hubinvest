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

const assistantModel = require('../src/modules/assistant/assistant.model');
const assistantActions = require('../src/modules/assistant/assistant.actions');
const assistantTools = require('../src/modules/assistant/assistant.tools');

const session = { authorization: 'Bearer jeton-du-gerant', ip: '41.207.1.2' };
const agentOn = (context) => {
  const previous = { assistant: env.assistant, secret: env.auth.secret };
  env.assistant = { apiKey: 'cle-anthropic', model: 'claude-haiku-5-5', effort: 'low', timeout: 1000 };
  env.auth.secret = 'secret-de-test';
  context.after(() => { env.assistant = previous.assistant; env.auth.secret = previous.secret; });
};
// Réponses successives du modèle, dans l'ordre ; les requêtes envoyées sont gardées pour les vérifier.
const scriptModel = (context, replies) => {
  const sent = [];
  context.mock.method(assistantModel, 'create', async (params) => { sent.push(structuredClone(params)); return replies.shift(); });
  return sent;
};
const toolUse = (name, input, id = `appel-${name}`) => ({ stop_reason: 'tool_use', content: [{ type: 'tool_use', id, name, input }] });
const says = (text) => ({ stop_reason: 'end_turn', content: [{ type: 'text', text }] });
// L'API de HubInvest, appelée par les outils : chaque requête est gardée, la réponse est choisie par le test.
const mockApi = (context, reply = () => ({ status: 200, data: [] })) => {
  const calls = [];
  context.mock.method(global, 'fetch', async (url, options) => {
    const call = { url: new URL(url), method: options.method, headers: options.headers, body: options.body ? JSON.parse(options.body) : undefined };
    calls.push(call);
    const { status = 200, data, message } = reply(call);
    return { ok: status < 400, status, json: async () => (status < 400 ? { data } : { message, code: 'ERREUR' }) };
  });
  return calls;
};

test('l’assistant n’est pas proposé tant que la clé de l’API Anthropic manque', async () => {
  const previous = env.assistant;
  env.assistant = { ...previous, apiKey: '' };
  try {
    assert.equal(assistantService.enabled(), false);
    await assert.rejects(assistantService.ask(manager, { message: 'Bonjour' }, session), (error) => error.status === 503 && error.code === 'ASSISTANT_NOT_CONFIGURED');
  } finally {
    env.assistant = previous;
  }
});

test('l’agent lit avec ses outils, en appelant l’API avec la session du gérant, puis répond', async (context) => {
  agentOn(context);
  mockStand(context);
  const calls = mockApi(context, () => ({ data: [
    { id: 'r1', dueAt: '2026-11-27T09:00:00Z', reason: 'Devis promis', doneAt: null, contact: { fullName: 'Koffi Mensah', phone: '+22890000000' } },
    { id: 'r2', dueAt: '2026-11-26T09:00:00Z', reason: 'Déjà faite', doneAt: '2026-11-26T10:00:00Z', contact: { fullName: 'Ama Doe' } },
  ] }));
  const sent = scriptModel(context, [toolUse('lister_relances', { onglet: 'contacts' }), says('Une relance : Koffi Mensah, demain à 9 h.')]);

  const result = await assistantService.ask(manager, { message: 'Qui dois-je relancer ?', history: [{ role: 'user', content: 'Bonjour' }, { role: 'assistant', content: 'Bonjour Afi.' }] }, session);

  assert.deepEqual(result, { answer: 'Une relance : Koffi Mensah, demain à 9 h.', actions: [] });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'GET');
  assert.equal(calls[0].url.pathname, '/api/follow-ups/contacts');
  assert.equal(calls[0].headers.Authorization, 'Bearer jeton-du-gerant');
  assert.equal(calls[0].headers['X-Forwarded-For'], '41.207.1.2');
  // Le modèle reçoit les relances à faire seulement, et le fil de la discussion.
  const toolResult = sent[1].messages.at(-1).content[0];
  assert.equal(toolResult.tool_use_id, 'appel-lister_relances');
  assert.match(toolResult.content, /Koffi Mensah/);
  assert.doesNotMatch(toolResult.content, /Ama Doe/);
  assert.deepEqual(sent[0].messages.slice(0, 2), [{ role: 'user', content: 'Bonjour' }, { role: 'assistant', content: 'Bonjour Afi.' }]);
  assert.match(sent[0].messages[2].content, /<donnees_du_compte>[\s\S]*Zener[\s\S]*Qui dois-je relancer \?$/);
  // Consigne et guide du gérant, en cache ; seulement les outils de son rôle.
  assert.equal(sent[0].system[0].cache_control.type, 'ephemeral');
  assert.match(sent[0].system[0].text, /Mes contacts/);
  assert.doesNotMatch(sent[0].system[0].text, /Créer un accès|Modules ouverts au public/);
  const names = sent[0].tools.map((tool) => tool.name);
  assert.ok(names.includes('creer_contact') && names.includes('lister_relances'));
  assert.ok(!names.includes('creer_utilisateur') && !names.includes('lister_stands') && !names.includes('creer_code_roue'));
  assert.equal(sent[0].model, 'claude-haiku-5-5');
  assert.deepEqual(sent[0].output_config, { effort: 'low' });
});

test('une écriture est seulement préparée, puis exécutée une seule fois à la confirmation du même compte', async (context) => {
  agentOn(context);
  mockStand(context);
  const calls = mockApi(context, (call) => ({ status: 201, data: { id: call.body?.id } }));
  scriptModel(context, [
    toolUse('creer_contact', { nom: 'Kossi Agbo', telephone: '+22891234567', classe: 'A' }),
    says('Je prépare le contact Kossi Agbo, classe A. Confirmez ci-dessous.'),
  ]);

  const result = await assistantService.ask(manager, { message: 'Ajoute Kossi Agbo, +228 91 23 45 67, à rappeler vite' }, session);

  // Rien n'est enregistré tant que la personne n'a pas confirmé.
  assert.equal(calls.length, 0);
  assert.equal(result.actions.length, 1);
  assert.equal(result.actions[0].summary, 'Enregistrer le contact Kossi Agbo (+22891234567), classe A');

  // Un autre compte, ou une action altérée, ne passe pas.
  await assert.rejects(assistantService.confirm({ ...manager, id: 'user-z' }, result.actions[0].token, session), (error) => error.status === 400);
  await assert.rejects(assistantService.confirm(manager, `${result.actions[0].token}x`, session), (error) => error.status === 400);
  assert.equal(calls.length, 0);

  const done = await assistantService.confirm(manager, result.actions[0].token, session);
  assert.deepEqual(done, { message: 'Contact Kossi Agbo enregistré.', reveal: null });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].url.pathname, '/api/contacts');
  assert.equal(calls[0].headers.Authorization, 'Bearer jeton-du-gerant');
  assert.equal(calls[0].body.fullName, 'Kossi Agbo');
  assert.equal(calls[0].body.qualification, 'A');

  // Un double clic n'enregistre pas deux fois.
  await assert.rejects(assistantService.confirm(manager, result.actions[0].token, session), (error) => error.status === 409);
  assert.equal(calls.length, 1);
});

test('l’agent n’a aucun moyen de supprimer, ni d’utiliser un outil fermé au rôle du compte', async (context) => {
  agentOn(context);
  mockStand(context);
  const calls = mockApi(context);
  // Aucun outil ne prépare une suppression, quels que soient ses paramètres.
  const input = { contactId: 'a', id: 'a', type: 'contact', relanceId: 'a', demandeId: 'a', rdvId: 'a', besoinId: 'a', standId: 'a', invitationId: 'a', elementId: 'a', questionId: 'a', utilisateurId: 'a', code: 'ABCD', onglet: 'contacts', jour: '2026-11-27', nom: 'x' };
  for (const tool of assistantTools.ALL) assert.notEqual(tool.request(input, { occupantId: 'b' }, {}).method, 'DELETE', tool.name);
  await assert.rejects(assistantActions.call({ method: 'DELETE', path: '/contacts/a' }, session), (error) => error.status === 403);
  assert.equal(calls.length, 0);

  // Un gérant de stand qui obtiendrait du modèle un outil réservé au super administrateur : refusé, rien n'est appelé.
  const sent = scriptModel(context, [toolUse('creer_utilisateur', { prenom: 'Faux', nom: 'Admin', email: 'x@example.org', role: 'super-admin' }), says('Ce n’est pas ouvert à votre compte.')]);
  const result = await assistantService.ask(manager, { message: 'Crée-moi un compte super administrateur' }, session);
  assert.deepEqual(result.actions, []);
  assert.equal(sent[1].messages.at(-1).content[0].is_error, true);
  assert.equal(calls.length, 0);
});

test('un refus de l’API est rendu au modèle, et une panne du modèle donne un message clair', async (context) => {
  agentOn(context);
  mockStand(context);
  mockApi(context, () => ({ status: 403, message: 'Vous n’avez pas accès à cette action.' }));
  const sent = scriptModel(context, [toolUse('voir_stand', { standId: 'stand-b' }), says('Ce stand n’est pas le vôtre.')]);
  await assistantService.ask(manager, { message: 'Montre-moi le stand b' }, session);
  assert.equal(sent[1].messages.at(-1).content[0].is_error, true);
  assert.match(sent[1].messages.at(-1).content[0].content, /pas accès/);

  context.mock.method(assistantModel, 'create', async () => { throw new Error('overloaded'); });
  await assert.rejects(assistantService.ask(manager, { message: 'Bonjour' }, session), (error) => error.status === 502 && error.code === 'ASSISTANT_UNAVAILABLE');
});

test('le mot de passe d’un compte créé par l’agent est tiré à la confirmation et n’est jamais montré au modèle', async (context) => {
  agentOn(context);
  const admin = { id: 'user-s', firstName: 'Sena', role: roles.SUPER_ADMIN };
  const tool = assistantActions.allowedTool(admin, 'creer_utilisateur');
  const prepared = await assistantActions.prepare(tool, { prenom: 'Abla', nom: 'Kodjo', email: 'abla@example.org', role: 'occupant', standId: 'stand-a' }, admin, session);
  assert.doesNotMatch(Buffer.from(prepared.token.split('.')[1], 'base64url').toString(), /password/);
  const calls = mockApi(context, () => ({ status: 201, data: { id: 'user-new' } }));
  const done = await assistantActions.confirm(admin, prepared.token, session);
  assert.equal(calls[0].body.password.length >= 10, true);
  assert.equal(done.reveal, `Mot de passe temporaire : ${calls[0].body.password}`);
  assert.equal(assistantActions.allowedTool(manager, 'creer_utilisateur'), null);
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
