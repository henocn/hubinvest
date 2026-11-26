const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { UniqueConstraintError } = require('sequelize');
const contactService = require('../src/modules/contact/contact.service');
const contactRepository = require('../src/modules/contact/contact.repository');
const followUpService = require('../src/modules/follow-up/follow-up.service');
const followUpRepository = require('../src/modules/follow-up/follow-up.repository');
const occupantService = require('../src/modules/occupant/occupant.service');
const occupantRepository = require('../src/modules/occupant/occupant.repository');
const userService = require('../src/modules/user/user.service');
const userRepository = require('../src/modules/user/user.repository');
const investorRequestService = require('../src/modules/investor-request/investor-request.service');
const investorRequestRepository = require('../src/modules/investor-request/investor-request.repository');
const investorRequestValidation = require('../src/modules/investor-request/investor-request.validation');
const b2bNeedService = require('../src/modules/b2b-need/b2b-need.service');
const b2bNeedRepository = require('../src/modules/b2b-need/b2b-need.repository');
const b2bProposalService = require('../src/modules/b2b-proposal/b2b-proposal.service');
const b2bProposalRepository = require('../src/modules/b2b-proposal/b2b-proposal.repository');
const studioInvitationService = require('../src/modules/studio-invitation/studio-invitation.service');
const studioInvitationRepository = require('../src/modules/studio-invitation/studio-invitation.repository');
const challengePassportService = require('../src/modules/challenge-passport/challenge-passport.service');
const challengePassportRepository = require('../src/modules/challenge-passport/challenge-passport.repository');
const challengePassageService = require('../src/modules/challenge-passage/challenge-passage.service');
const challengePassageRepository = require('../src/modules/challenge-passage/challenge-passage.repository');
const authService = require('../src/modules/auth/auth.service');
const authRepository = require('../src/modules/auth/auth.repository');
const authMailer = require('../src/modules/auth/auth.mailer');
const { authenticate } = require('../src/middlewares/auth.middleware');
const roles = require('../src/shared/roles');
const { sequelize, User, Occupant, B2bNeed } = require('../src/models');
const env = require('../src/config/env');
const app = require('../src/app');
const notificationService = require('../src/modules/notification/notification.service');
const notificationRepository = require('../src/modules/notification/notification.repository');
const notificationWorker = require('../src/modules/notification/notification.worker');
const pushSubscriptionRepository = require('../src/modules/push-subscription/push-subscription.repository');
const mailer = require('../src/shared/mailer');
const webPush = require('../src/shared/web-push');
const programEventService = require('../src/modules/program-event/program-event.service');
const wheelService = require('../src/modules/wheel/wheel.service');
const wheelRepository = require('../src/modules/wheel/wheel.repository');
const programEventRepository = require('../src/modules/program-event/program-event.repository');

env.notifications.enabled = false;

test('un occupant doit connaître son mot de passe actuel pour le remplacer', async (context) => {
  const user = {
    passwordHash: await bcrypt.hash('ancien-secret', 4),
    update: async (values) => Object.assign(user, values),
  };
  context.mock.method(userRepository, 'findByIdWithPassword', async () => user);
  context.mock.method(userRepository, 'update', async (target, values) => target.update(values));

  await assert.rejects(
    userService.changePassword({ id: 'user-a' }, { currentPassword: 'incorrect', newPassword: 'nouveau-secret' }),
    (error) => error.status === 422 && error.code === 'INVALID_CURRENT_PASSWORD',
  );

  await userService.changePassword(
    { id: 'user-a' },
    { currentPassword: 'ancien-secret', newPassword: 'nouveau-secret' },
  );

  assert.equal(await bcrypt.compare('nouveau-secret', user.passwordHash), true);
});

test('les comptes utilisent seulement les quatre rôles retenus', () => {
  assert.deepEqual(Object.values(roles).sort(), ['admin', 'animateur', 'occupant', 'super-admin']);
});

test('un occupant doit être rattaché à un stand ; l’administrateur (API-ZF) ne l’est jamais', async (context) => {
  context.mock.method(userRepository, 'findOccupantById', async (id) => (id === 'occupant-a' ? { id } : null));
  context.mock.method(userRepository, 'create', async (values) => ({ toJSON: () => values }));

  await assert.rejects(
    userService.create({ role: 'super-admin' }, {
      firstName: 'Koffi', lastName: 'Mensah', email: 'stand@example.com', password: 'secret-test', role: 'occupant',
    }),
    (error) => error.status === 422 && error.code === 'OCCUPANT_REQUIRED',
  );

  const created = await userService.create({ role: 'super-admin' }, {
    firstName: 'Koffi', lastName: 'Mensah', email: 'stand@example.com', password: 'secret-test', role: 'occupant', occupantId: 'occupant-a',
  });
  assert.equal(created.occupantId, 'occupant-a');

  const apizf = await userService.create({ role: 'super-admin' }, {
    firstName: 'Ama', lastName: 'Kossi', email: 'apizf@example.com', password: 'secret-test', role: 'admin', occupantId: 'occupant-a',
  });
  assert.equal(apizf.occupantId, null);
});

test('la récupération envoie cinq chiffres et ne stocke jamais le code en clair', async (context) => {
  const previousSecret = env.auth.secret;
  env.auth.secret = 'secret-de-test';
  context.after(() => { env.auth.secret = previousSecret; });
  const users = {
    'occupant@example.com': { id: 'occupant-user', firstName: 'Afi', email: 'occupant@example.com', role: 'occupant', occupantId: 'occupant-a', occupant: { status: 'active' }, isActive: true },
    'admin@example.com': { id: 'admin-user', firstName: 'Koffi', email: 'admin@example.com', role: 'admin', occupantId: 'occupant-b', occupant: { status: 'active' }, isActive: true },
  };
  const storedHashes = [];
  const sentCodes = [];
  context.mock.method(authMailer, 'isConfigured', () => true);
  context.mock.method(authRepository, 'findUserByEmail', async (email) => users[email]);
  context.mock.method(authRepository, 'savePasswordReset', async (_user, hash, expiresAt) => {
    storedHashes.push({ hash, expiresAt });
  });
  context.mock.method(authMailer, 'sendPasswordReset', async (user, code) => { sentCodes.push({ email: user.email, code }); });

  await authService.forgotPassword({ email: 'occupant@example.com' });
  await authService.forgotPassword({ email: 'admin@example.com' });
  await authService.forgotPassword({ email: 'inconnu@example.com' });

  assert.equal(sentCodes.length, 2);
  assert.equal(storedHashes.length, 2);
  sentCodes.forEach(({ email, code }, index) => {
    assert.match(code, /^\d{5}$/);
    assert.equal(storedHashes[index].hash, crypto.createHmac('sha256', env.auth.secret).update(`${email}:${code}`).digest('hex'));
    assert.notEqual(storedHashes[index].hash, code);
    assert.ok(storedHashes[index].expiresAt > new Date());
  });
});

test('un code de récupération est utilisable une seule fois avant son expiration', async (context) => {
  const previousSecret = env.auth.secret;
  env.auth.secret = 'secret-de-test';
  context.after(() => { env.auth.secret = previousSecret; });
  const email = 'occupant@example.com';
  const code = '12345';
  let savedPasswordHash;
  let failedAttempts = 0;
  context.mock.method(authRepository, 'resetPassword', async (requestedEmail, codeHash, passwordHash) => {
    assert.equal(requestedEmail, email);
    assert.equal(codeHash, crypto.createHmac('sha256', env.auth.secret).update(`${email}:${code}`).digest('hex'));
    if (savedPasswordHash) return false;
    savedPasswordHash = passwordHash;
    return true;
  });
  context.mock.method(authRepository, 'recordFailedReset', async () => { failedAttempts += 1; });

  await authService.resetPassword({ email, code, password: 'nouveau-secret' });
  assert.equal(await bcrypt.compare('nouveau-secret', savedPasswordHash), true);
  await assert.rejects(
    authService.resetPassword({ email, code, password: 'autre-secret' }),
    (error) => error.status === 422 && error.code === 'PASSWORD_RESET_INVALID',
  );
  assert.equal(failedAttempts, 1);
});

test('les listes et les details restent limites a l’occupant authentifie', async (context) => {
  const calls = [];
  context.mock.method(contactRepository, 'findAll', async (query) => {
    calls.push(query);
    return { rows: [], count: 0 };
  });
  context.mock.method(contactRepository, 'findById', async (occupantId, id) => {
    calls.push({ occupantId, id });
    return null;
  });

  const user = { id: 'user-a', occupantId: 'occupant-a' };
  await contactService.list(user, { occupantId: 'occupant-b', limit: 50, offset: 0 });
  assert.equal(calls[0].occupantId, 'occupant-a');

  await assert.rejects(
    contactService.get(user, 'contact-b'),
    (error) => error.status === 404 && error.code === 'CONTACT_NOT_FOUND',
  );
  assert.deepEqual(calls[1], { occupantId: 'occupant-a', id: 'contact-b' });
});

test('une resynchronisation du meme contact ne cree pas de doublon', async (context) => {
  context.mock.method(followUpService, 'applyClassFollowUp', async () => null);
  let saved = null;
  let inserts = 0;
  context.mock.method(contactRepository.sequelize, 'transaction', async (callback) => callback({}));
  context.mock.method(contactRepository, 'findExisting', async (occupantId, id) =>
    saved?.occupantId === occupantId && saved.id === id ? saved : null);
  context.mock.method(contactRepository, 'create', async (values) => {
    inserts += 1;
    saved = values;
    return values;
  });

  const user = { id: 'user-a', occupantId: 'occupant-a' };
  const values = { id: 'contact-a', fullName: 'Contact Test', phone: '0102030405' };
  const first = await contactService.create(user, values);
  const second = await contactService.create(user, values);

  assert.equal(inserts, 1);
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(saved.occupantId, 'occupant-a');
  assert.equal(saved.createdByUserId, 'user-a');
});

test('deux synchronisations concurrentes aboutissent au meme contact', async (context) => {
  const saved = { id: 'contact-a', occupantId: 'occupant-a' };
  context.mock.method(contactRepository.sequelize, 'transaction', async () => {
    throw new UniqueConstraintError({ message: 'duplicate key' });
  });
  context.mock.method(contactRepository, 'findExisting', async (occupantId, id) =>
    occupantId === saved.occupantId && id === saved.id ? saved : null);

  const result = await contactService.create(
    { id: 'user-a', occupantId: 'occupant-a' },
    { id: 'contact-a' },
  );

  assert.equal(result.created, false);
  assert.equal(result.contact, saved);
});

test('un occupant desactive perd acces meme avec un jeton encore valide', async (context) => {
  const originalSecret = env.auth.secret;
  env.auth.secret = 'hubinvest-critical-test-secret';
  context.after(() => { env.auth.secret = originalSecret; });
  context.mock.method(User, 'findOne', async () => ({
    occupantId: 'occupant-a',
    occupant: { status: 'inactive' },
    toJSON: () => ({ id: 'user-a', occupantId: 'occupant-a' }),
  }));

  const token = jwt.sign({}, env.auth.secret, { subject: 'user-a' });
  let result;
  await authenticate({ headers: { authorization: `Bearer ${token}` } }, {}, (error) => {
    result = error;
  });

  // Session plus valable : 401, l'application ramène à la connexion (un 403 ne déconnecte plus).
  assert.equal(result.status, 401);
  assert.equal(result.code, 'OCCUPANT_INACTIVE');
});

test('les totaux globaux proviennent des groupes et restent réservés au super administrateur', async (context) => {
  context.mock.method(contactRepository, 'countByOccupant', async () => [
    { occupantId: 'occupant-a', count: '2' },
    { occupantId: 'occupant-b', count: '3' },
  ]);

  await assert.rejects(
    contactService.adminStats({ role: 'occupant', occupantId: 'occupant-a' }),
    (error) => error.status === 403 && error.code === 'FORBIDDEN',
  );

  const result = await contactService.adminStats({ role: 'super-admin' });
  assert.deepEqual(result, {
    total: 5,
    byOccupant: { 'occupant-a': 2, 'occupant-b': 3 },
  });
});

test('la route des totaux refuse un occupant et accepte le super administrateur', async (context) => {
  const originalSecret = env.auth.secret;
  env.auth.secret = 'hubinvest-critical-test-secret';
  context.after(() => { env.auth.secret = originalSecret; });
  context.mock.method(User, 'findOne', async ({ where }) => {
    const isAdmin = where.id === 'admin';
    return {
      occupantId: isAdmin ? null : 'occupant-a',
      occupant: isAdmin ? null : { status: 'active' },
      toJSON: () => ({
        id: where.id,
        occupantId: isAdmin ? null : 'occupant-a',
        role: isAdmin ? 'super-admin' : 'occupant',
      }),
    };
  });
  context.mock.method(contactRepository, 'countByOccupant', async () => [
    { occupantId: 'occupant-a', count: '2' },
  ]);

  const server = app.listen(0, '127.0.0.1');
  context.after(() => server.close());
  await new Promise((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/contacts/admin/stats`;
  const requestAs = (subject) => fetch(url, {
    headers: { Authorization: `Bearer ${jwt.sign({}, env.auth.secret, { subject })}` },
  });

  const occupantResponse = await requestAs('member');
  assert.equal(occupantResponse.status, 403);

  const adminResponse = await requestAs('admin');
  assert.equal(adminResponse.status, 200);
  assert.deepEqual((await adminResponse.json()).data, {
    total: 2,
    byOccupant: { 'occupant-a': 2 },
  });
});

test('la liste publique ne lit que les stands actifs', async (context) => {
  context.mock.method(Occupant, 'findAll', async (options) => options);
  const result = await occupantRepository.findPublic();
  assert.deepEqual(result.where, { status: 'active' });
  assert.ok(!result.attributes.includes('status'));
  assert.ok(!result.attributes.includes('proofNumber'));
  assert.ok(result.attributes.includes('coverImageUrl'));
});

test('une fiche active garde son adresse quand son nom change', async (context) => {
  const saved = { id: 'stand-a', slug: 'ancien-nom', name: 'Ancien nom', status: 'active', activity: 'Industrie' };
  context.mock.method(occupantRepository, 'findById', async () => saved);
  context.mock.method(occupantRepository, 'update', async (_occupant, values) => values);

  const changed = await occupantService.update(saved.id, { name: 'Nouveau nom' });
  assert.equal(changed.slug, undefined);
  await assert.rejects(
    occupantService.update(saved.id, { slug: 'nouveau-nom' }),
    (error) => error.status === 409 && error.code === 'PUBLIC_LINK_LOCKED',
  );
});

test('une couverture de stand stocke un chemin public et non une URL saisie', async (context) => {
  const occupant = { id: 'stand-a', coverImageUrl: null };
  context.mock.method(occupantRepository, 'findById', async () => occupant);
  context.mock.method(occupantRepository, 'update', async (_occupant, values) => values);

  const changed = await occupantService.updateCover(occupant.id, { filename: 'couverture.webp' });

  assert.equal(changed.coverImageUrl, '/uploads/covers/couverture.webp');
});

test('une demande publique ne peut pas cibler un stand indisponible', async (context) => {
  context.mock.method(occupantRepository, 'findBySlug', async () => null);
  context.mock.method(contactRepository, 'create', async () => {
    throw new Error('La création ne doit pas être appelée.');
  });
  await assert.rejects(
    contactService.createPublic('stand-prive', { id: 'request-a', consentOccupant: true }),
    (error) => error.status === 404 && error.code === 'STAND_NOT_FOUND',
  );
});

test('une demande publique sans accord est refusée avant toute écriture', async (context) => {
  context.mock.method(contactRepository, 'create', async () => {
    throw new Error('La création ne doit pas être appelée.');
  });
  await assert.rejects(
    contactService.createPublic('stand-a', { consentOccupant: false }),
    (error) => error.status === 422 && error.code === 'CONSENT_REQUIRED',
  );
});

test('une demande publique est rattachée au stand lu par le serveur ; sa classe vient de la réponse « quand », sans accord API-ZF forcé', async (context) => {
  context.mock.method(followUpService, 'applyClassFollowUp', async () => null);
  let saved;
  context.mock.method(occupantRepository, 'findBySlug', async () => ({ id: 'stand-a' }));
  context.mock.method(contactRepository.sequelize, 'transaction', async (callback) => callback({}));
  context.mock.method(contactRepository, 'findExisting', async () => null);
  context.mock.method(contactRepository, 'create', async (values) => { saved = values; return values; });

  const result = await contactService.createPublic('stand-a', {
    id: 'request-a', fullName: 'Visiteur Test', phone: '90000000', need: 'Un renseignement',
    consentOccupant: true, occupantId: 'stand-b', qualification: 'A', consentApizf: true,
  });
  assert.equal(result.created, true);
  assert.equal(saved.occupantId, 'stand-a');
  assert.equal(saved.createdByUserId, null);
  assert.equal(saved.qualification, 'A');
  assert.equal(saved.consentApizf, false);
  assert.equal(saved.source, 'public');
  assert.ok(saved.consentCapturedAt instanceof Date);
});

test('une demande Investor Desk exige le consentement API-ZF', () => {
  const { error } = investorRequestValidation.createPublic.validate({
    fullName: 'Investisseur Test',
    email: 'investisseur@example.com',
    projectSummary: 'Projet industriel à présenter.',
    consentApizf: false,
  });

  assert.ok(error);
});

test('le statut des guichets ne se saisit pas : il est calculé à partir de la classe et des relances', () => {
  const { update } = investorRequestValidation;
  assert.ok(update.validate({ status: 'closed', nextAction: 'x' }, { stripUnknown: true }).error);
  assert.deepEqual(update.validate({ classification: 'a', status: 'closed' }, { stripUnknown: true }).value, { classification: 'A' });
});

test('la liste publique B2B ne contient que les besoins ouverts de stands actifs', async (context) => {
  context.mock.method(B2bNeed, 'findAll', async (options) => options);

  const result = await b2bNeedRepository.findPublic();

  assert.deepEqual(result.where, { status: 'open' });
  assert.deepEqual(result.include[0].where, { status: 'active' });
  assert.equal(result.include[0].required, true);
});

test('un occupant publie un besoin B2B uniquement pour son stand', async (context) => {
  let saved;
  context.mock.method(b2bNeedRepository, 'findOccupantById', async (id) => ({ id }));
  context.mock.method(b2bNeedRepository, 'create', async (values) => { saved = values; return values; });

  await b2bNeedService.create(
    { id: 'admin-a', role: 'occupant', occupantId: 'occupant-a' },
    { occupantId: 'occupant-b', title: 'Besoin test', description: 'Description du besoin test.' },
  );
  assert.equal(saved.occupantId, 'occupant-a');
});

test('une proposition B2B sans consentement est refusée avant toute écriture', async (context) => {
  context.mock.method(b2bProposalRepository, 'create', async () => {
    throw new Error('La création ne doit pas être appelée.');
  });

  await assert.rejects(
    b2bProposalService.createPublic('need-a', { consentOccupant: false }),
    (error) => error.status === 422 && error.code === 'CONSENT_REQUIRED',
  );
});

test('la liste des demandes B2B se limite au stand d’un occupant', async (context) => {
  const scopes = [];
  context.mock.method(b2bProposalRepository, 'findAllVisible', async (occupantId = null) => { scopes.push(occupantId); return []; });

  await b2bProposalService.listAll({ role: 'occupant', occupantId: 'occupant-b' });
  await b2bProposalService.listAll({ role: 'super-admin' });
  assert.deepEqual(scopes, ['occupant-b', null]);
  await assert.rejects(b2bProposalService.listAll({ role: 'occupant', occupantId: null }), (error) => error.code === 'STAND_REQUIRED');
});

test('corriger une demande B2B ne prévient pas la personne ; la supprimer reste limité au stand', async (context) => {
  const proposal = { id: 'proposal-a', status: 'pending', need: { occupantId: 'occupant-b', title: 'Besoin' } };
  let saved = null;
  let destroyed = false;
  context.mock.method(b2bProposalRepository, 'findById', async () => proposal);
  context.mock.method(b2bProposalRepository, 'update', async (item, values) => { saved = values; return { ...item, ...values }; });
  context.mock.method(b2bProposalRepository, 'destroy', async () => { destroyed = true; });
  const decided = context.mock.method(notificationService, 'b2bProposalDecided', () => {});

  await b2bProposalService.update({ id: 'user-b', role: 'occupant', occupantId: 'occupant-b' }, 'proposal-a', { email: 'Awa@Exemple.tg', phone: '' });
  assert.deepEqual(saved, { email: 'awa@exemple.tg', phone: null });
  assert.equal(decided.mock.callCount(), 0);

  await assert.rejects(
    b2bProposalService.remove({ role: 'occupant', occupantId: 'occupant-a' }, 'proposal-a'),
    (error) => error.code === 'B2B_PROPOSAL_NOT_FOUND',
  );
  assert.equal(destroyed, false);
  await b2bProposalService.remove({ role: 'occupant', occupantId: 'occupant-b' }, 'proposal-a');
  assert.equal(destroyed, true);
});

test('le backoffice B2B peut lire les propositions d’un besoin existant', async (context) => {
  context.mock.method(b2bNeedRepository, 'findById', async () => ({ id: 'need-b', occupantId: 'occupant-b' }));
  context.mock.method(b2bProposalRepository, 'findAllByNeed', async (needId) => [{ id: 'proposal-a', b2bNeedId: needId }]);

  const result = await b2bProposalService.list({ role: 'occupant', occupantId: 'occupant-b' }, 'need-b');
  assert.deepEqual(result, [{ id: 'proposal-a', b2bNeedId: 'need-b' }]);
});

test('une invitation Studio utilise un lien personnel imprévisible et l’envoie à l’invité', async (context) => {
  let saved;
  const sent = [];
  context.mock.method(studioInvitationRepository, 'create', async (values) => { saved = values; return values; });
  context.mock.method(studioInvitationRepository, 'findOccupantById', async (id) => ({ id }));
  context.mock.method(notificationService, 'studioInvited', (invitation) => { sent.push(invitation.email); });

  await studioInvitationService.create(
    { id: 'campaign-user', role: 'admin' },
    { guestName: 'Invité Test', email: 'Invite@Example.com', format: 'two_minutes', occupantId: 'occupant-a' },
  );

  assert.match(saved.token, /^[a-f0-9]{64}$/);
  assert.equal(saved.createdByUserId, 'campaign-user');
  assert.equal(saved.occupantId, 'occupant-a');
  assert.equal(saved.status, 'invited');
  assert.equal(saved.scheduledAt, null);
  assert.deepEqual(sent, ['invite@example.com']);
});

test('l’invité du Studio réserve lui-même un créneau libre ; la page publique ne révèle ni le lien ni l’équipe', async (context) => {
  const day = new Date(Date.now() + 3 * 24 * 3600000).toISOString().slice(0, 10);
  context.mock.method(settingsService, 'studioSchedule', () => ({ firstDay: day, lastDay: day, dayStart: '14:00', dayEnd: '15:00', minutes: 20 }));
  const invitation = { id: 'inv-1', token: 'a'.repeat(64), guestName: 'Afi', format: 'two_minutes', status: 'invited', scheduledAt: null, createdByUserId: 'u1', occupantId: null };
  context.mock.method(studioInvitationRepository, 'findByToken', async () => invitation);
  context.mock.method(studioInvitationRepository, 'findBookedBetween', async () => [{ id: 'other', scheduledAt: new Date(`${day}T14:20:00Z`) }]);
  context.mock.method(studioInvitationRepository, 'update', async (item, values) => Object.assign(item, values));
  const booked = [];
  context.mock.method(notificationService, 'studioBooked', (item, changed) => { booked.push(changed); });

  const { slots } = await studioInvitationService.publicSlots(invitation.token);
  assert.deepEqual(slots, [`${day}T14:00:00.000Z`, `${day}T14:40:00.000Z`]);

  await assert.rejects(studioInvitationService.book(invitation.token, `${day}T14:10:00Z`), (error) => error.code === 'STUDIO_SLOT_INVALID');
  const result = await studioInvitationService.book(invitation.token, `${day}T14:40:00Z`);
  assert.equal(result.status, 'booked');
  assert.equal(result.scheduledAt.toISOString(), `${day}T14:40:00.000Z`);
  assert.equal('token' in result, false);
  assert.equal('createdByUserId' in result, false);
  assert.deepEqual(booked, [false]);

  // Une fois réservé, l'invité ne change ni n'annule lui-même : seule l'équipe déplace le passage.
  await assert.rejects(studioInvitationService.book(invitation.token, `${day}T14:00:00Z`), (error) => error.code === 'STUDIO_ALREADY_BOOKED');
  await assert.rejects(studioInvitationService.decline(invitation.token), (error) => error.code === 'STUDIO_ALREADY_BOOKED');
  context.mock.method(studioInvitationRepository, 'findById', async () => invitation);
  await studioInvitationService.schedule({ id: 'u1', role: 'super-admin' }, invitation.id, { startsAt: `${day}T14:00:00Z` });
  assert.equal(invitation.scheduledAt.toISOString(), `${day}T14:00:00.000Z`);
  assert.deepEqual(booked, [false, true]);

  // Avant de choisir, l'invité peut décliner.
  invitation.status = 'invited';
  invitation.scheduledAt = null;
  context.mock.method(notificationService, 'studioDeclined', () => {});
  const declined = await studioInvitationService.decline(invitation.token);
  assert.equal(declined.status, 'declined');
  assert.equal(declined.scheduledAt, null);
  await assert.rejects(studioInvitationService.book(invitation.token, `${day}T14:00:00Z`), (error) => error.code === 'STUDIO_INVITATION_CLOSED');
});

test('la capsule du Studio se livre après le passage et part à l’invité', async (context) => {
  const invitation = { id: 'inv-2', status: 'invited', email: 'a@b.tg', occupantId: null };
  context.mock.method(studioInvitationRepository, 'findById', async () => invitation);
  context.mock.method(studioInvitationRepository, 'update', async (item, values) => Object.assign(item, values));
  const delivered = [];
  context.mock.method(notificationService, 'studioCapsuleDelivered', (item) => { delivered.push(item.capsuleUrl); });
  const admin = { id: 'u1', role: 'super-admin' };

  await assert.rejects(studioInvitationService.deliver(admin, 'inv-2', { capsuleUrl: 'https://videos.tg/afi' }), (error) => error.code === 'STUDIO_NOT_RECORDED');
  invitation.status = 'booked';
  await studioInvitationService.deliver(admin, 'inv-2', { capsuleUrl: 'https://videos.tg/afi' });
  assert.equal(invitation.status, 'delivered');
  assert.deepEqual(delivered, ['https://videos.tg/afi']);
});

test('le Studio est réservé à l’équipe API-ZF : un occupant n’y a pas accès', async (context) => {
  const originalSecret = env.auth.secret;
  env.auth.secret = 'hubinvest-studio-test-secret';
  context.after(() => { env.auth.secret = originalSecret; });
  context.mock.method(User, 'findOne', async ({ where }) => ({
    occupantId: `occupant-${where.id}`,
    occupant: { status: 'active' },
    toJSON: () => ({ id: where.id, occupantId: `occupant-${where.id}`, role: where.id === 'apizf' ? 'admin' : 'occupant' }),
  }));
  context.mock.method(studioInvitationRepository, 'findAll', async () => []);

  const server = app.listen(0, '127.0.0.1');
  context.after(() => server.close());
  await new Promise((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/studio-invitations`;
  const requestAs = (subject, options = {}) => fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${jwt.sign({}, env.auth.secret, { subject })}`, 'Content-Type': 'application/json' },
  });

  assert.equal((await requestAs('pia')).status, 403);
  assert.equal((await requestAs('pia', { method: 'POST', body: JSON.stringify({ guestName: 'Afi', email: 'afi@example.com', format: 'two_minutes' }) })).status, 403);
  assert.equal((await requestAs('apizf')).status, 200);
});

test('l’identité d’un joueur est conservée sans être exposée sur son passeport public', async (context) => {
  let saved;
  context.mock.method(challengePassportRepository, 'create', async (values) => {
    saved = values;
    return { ...values, passages: [] };
  });

  const result = await challengePassportService.createPublic({ fullName: 'Afi Mensah', contact: '+22890000000' });

  assert.equal(saved.displayName, 'Afi Mensah');
  assert.equal(saved.email, null);
  assert.equal(saved.phone, '+22890000000');
  await challengePassportService.createPublic({ fullName: 'Afi Mensah', contact: 'afi@example.com' });
  assert.equal(saved.email, 'afi@example.com');
  assert.equal(saved.phone, null);
  assert.equal(result.displayName, 'Afi Mensah');
  assert.equal(result.email, undefined);
  assert.equal(result.phone, undefined);
});

test('la liste des joueurs conserve le validateur et son stand pour chaque scan', async (context) => {
  const passage = {
    id: 'passage-a',
    createdAt: new Date(),
    validatedBy: { id: 'user-a', firstName: 'Afi', lastName: 'Mensah' },
    occupant: { id: 'occupant-a', name: 'PIA', standLabel: 'Pavillon 2' },
  };
  context.mock.method(challengePassportRepository, 'findAll', async () => [{
    toJSON: () => ({ id: 'passport-a', displayName: 'Visiteur Test', passages: [passage] }),
  }]);

  const [result] = await challengePassportService.list({ role: 'super-admin' });
  assert.equal(result.passageCount, 1);
  assert.deepEqual(result.passages[0].validatedBy, passage.validatedBy);
  assert.deepEqual(result.passages[0].occupant, passage.occupant);
});

test('la liste des joueurs d’un occupant est limitée aux scans de son stand', async (context) => {
  let requestedStand;
  context.mock.method(challengePassportRepository, 'findAll', async (occupantId) => {
    requestedStand = occupantId;
    return [];
  });

  await challengePassportService.list({ role: 'occupant', occupantId: 'occupant-a' });
  assert.equal(requestedStand, 'occupant-a');
});

test('le contrôle animateur par code ne révèle pas le contact du participant', async (context) => {
  context.mock.method(challengePassportRepository, 'findByCode', async () => ({
    toJSON: () => ({
      id: 'passport-a',
      displayName: 'Visiteur Test',
      contact: 'visiteur@example.com',
      code: 'ABCD2345',
      status: 'completed',
      passages: [{ id: 'passage-a' }],
    }),
  }));

  const result = await challengePassportService.getByCode('ABCD2345');
  assert.equal(result.displayName, 'Visiteur Test');
  assert.equal(result.status, 'completed');
  assert.equal(result.contact, undefined);
});

test('un stand ne peut valider qu’une fois le même parcours', async (context) => {
  const passport = { id: 'passport-a', code: 'ABCD2345', status: 'active' };
  context.mock.method(challengePassageRepository.sequelize, 'transaction', async (callback) => callback({ LOCK: { UPDATE: 'UPDATE' } }));
  context.mock.method(challengePassportRepository, 'findByCodeForUpdate', async () => passport);
  context.mock.method(challengePassageRepository, 'findExisting', async () => ({ id: 'passage-a' }));
  context.mock.method(challengePassageRepository, 'create', async () => {
    throw new Error('La création ne doit pas être appelée.');
  });

  await assert.rejects(
    challengePassageService.validate({ id: 'user-a', occupantId: 'occupant-a' }, { code: passport.code }),
    (error) => error.status === 409 && error.code === 'PASSAGE_ALREADY_VALIDATED',
  );
});

test('le compteur des joueurs scannés reste limité à l’occupant connecté', async (context) => {
  let requestedOccupantId;
  context.mock.method(challengePassageRepository, 'countByOccupant', async (occupantId) => {
    requestedOccupantId = occupantId;
    return 4;
  });

  const result = await challengePassageService.stats({ id: 'user-a', occupantId: 'occupant-a' });
  assert.deepEqual(result, { scannedPlayers: 4 });
  assert.equal(requestedOccupantId, 'occupant-a');

  await assert.rejects(
    challengePassageService.stats({ id: 'user-b' }),
    (error) => error.status === 403 && error.code === 'OCCUPANT_REQUIRED',
  );
});

test('« Trouvez les 5 étapes » : quatre stands de l’Espace Industrie, puis la dernière étape au Stand API-ZF', async (context) => {
  const passport = { id: 'passport-a', code: 'ABCD2345', displayName: 'Visiteur Test', status: 'active' };
  const passages = [];
  const spaces = { 'industry-1': 'industry', 'industry-2': 'industry', 'industry-3': 'industry', 'industry-4': 'industry', 'industry-5': 'industry', apizf: 'apizf' };
  let saved;
  context.mock.method(challengePassageRepository.sequelize, 'transaction', async (callback) => callback({ LOCK: { UPDATE: 'UPDATE' } }));
  context.mock.method(challengePassportRepository, 'findByCodeForUpdate', async () => passport);
  context.mock.method(challengePassageRepository, 'findExisting', async (_id, occupantId) => passages.find((item) => item.occupantId === occupantId) || null);
  context.mock.method(challengePassageRepository, 'findOccupant', async (id) => ({ id, space: spaces[id] }));
  context.mock.method(challengePassageRepository, 'findByPassport', async () => passages.map((item) => ({ occupant: { space: spaces[item.occupantId] } })));
  context.mock.method(challengePassageRepository, 'create', async (values) => { passages.push(values); return values; });
  context.mock.method(challengePassageRepository, 'countByPassport', async () => passages.length);
  context.mock.method(challengePassportRepository, 'update', async (_passport, values) => { saved = values; Object.assign(passport, values); return passport; });
  const scan = (occupantId) => challengePassageService.validate({ id: 'user-c', occupantId }, { code: passport.code });

  await assert.rejects(scan('apizf'), (error) => error.code === 'CHALLENGE_APIZF_LAST');
  for (const stand of ['industry-1', 'industry-2', 'industry-3']) assert.equal((await scan(stand)).status, 'active');
  await assert.rejects(scan('apizf'), (error) => error.code === 'CHALLENGE_APIZF_LAST');
  assert.equal((await scan('industry-4')).passageCount, 4);
  await assert.rejects(scan('industry-5'), (error) => error.code === 'CHALLENGE_FINISH_AT_APIZF');

  const result = await scan('apizf');
  assert.equal(result.status, 'completed');
  assert.equal(result.requiredPassages, 5);
  assert.equal(saved.status, 'completed');
  assert.ok(saved.completedAt instanceof Date);
});

test('la remise d’une récompense respecte le stock suivi', async (context) => {
  const passport = { id: 'passport-b', code: 'ABCD2346', status: 'completed', passages: [] };
  context.mock.method(sequelize, 'transaction', async (callback) => callback({ LOCK: { UPDATE: 'UPDATE' } }));
  context.mock.method(challengePassportRepository, 'findByCodeForUpdate', async () => passport);
  context.mock.method(challengePassportRepository, 'update', async (_passport, values) => Object.assign(passport, values));
  context.mock.method(settingsService, 'challengeRewardStock', () => 10);
  context.mock.method(challengePassportRepository, 'countRedeemed', async () => 10);
  await assert.rejects(challengePassportService.redeemByCode({ id: 'animator-a', role: 'animateur' }, passport.code), (error) => error.code === 'REWARD_OUT_OF_STOCK');

  context.mock.method(challengePassportRepository, 'countRedeemed', async () => 9);
  assert.equal((await challengePassportService.redeemByCode({ id: 'animator-a', role: 'animateur' }, passport.code)).status, 'redeemed');
});

test('un animateur remet par code une récompense Défis une seule fois', async (context) => {
  const passport = { id: 'passport-a', code: 'ABCD2345', status: 'completed', passages: [] };
  context.mock.method(sequelize, 'transaction', async (callback) => callback({ LOCK: { UPDATE: 'UPDATE' } }));
  context.mock.method(challengePassportRepository, 'findByCodeForUpdate', async () => passport);
  context.mock.method(challengePassportRepository, 'update', async (_passport, values) => {
    Object.assign(passport, values);
    return passport;
  });

  const first = await challengePassportService.redeemByCode({ id: 'animator-a', role: 'animateur' }, passport.code);
  assert.equal(first.status, 'redeemed');

  await assert.rejects(
    challengePassportService.redeemByCode({ id: 'animator-b', role: 'animateur' }, passport.code),
    (error) => error.status === 409 && error.code === 'REWARD_ALREADY_REDEEMED',
  );
});

test('un lien participant inventé reste introuvable', async (context) => {
  context.mock.method(challengePassportRepository, 'findPublicByToken', async () => null);

  await assert.rejects(
    challengePassportService.getPublic('a'.repeat(64)),
    (error) => error.status === 404 && error.code === 'CHALLENGE_PASSPORT_NOT_FOUND',
  );
});

// Laisse s'exécuter les notifications planifiées hors du parcours de la requête.
const flushNotifications = async () => {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
};

// Active la planification des notifications le temps d'un test.
const enableNotifications = (context) => {
  env.notifications.enabled = true;
  context.after(() => { env.notifications.enabled = false; });
};

test('une notification de compte part en push, puis par e-mail seulement sans appareil joignable', async (context) => {
  const pushed = [];
  const emails = [];
  const removed = [];
  const sent = [];
  const subscriptions = {
    'user-push': [{ endpoint: 'https://push.example/ok' }, { endpoint: 'https://push.example/expired' }],
    'user-email': [{ endpoint: 'https://push.example/expired' }],
  };
  context.mock.method(webPush, 'isConfigured', () => true);
  context.mock.method(webPush, 'send', async (subscription, message) => {
    if (subscription.endpoint.endsWith('expired')) throw Object.assign(new Error('Gone'), { statusCode: 410 });
    pushed.push(message);
  });
  context.mock.method(mailer, 'isConfigured', () => true);
  context.mock.method(mailer, 'send', async (mail) => { emails.push(mail); });
  context.mock.method(pushSubscriptionRepository, 'findByUser', async (userId) => subscriptions[userId]);
  context.mock.method(pushSubscriptionRepository, 'remove', async (subscription) => { removed.push(subscription.endpoint); });
  context.mock.method(notificationRepository, 'findActiveUser', async (id) => ({ id, email: `${id}@example.com` }));
  context.mock.method(notificationRepository, 'markSent', async (id) => { sent.push(id); });

  const payload = { title: 'Titre', body: 'Message', url: 'https://hubinvest.example', subject: 'Sujet', text: 'Texte' };
  await notificationWorker.processJob({ id: 'job-push', channel: 'user', recipient: 'user-push', payload, attempts: 1 });
  await notificationWorker.processJob({ id: 'job-email', channel: 'user', recipient: 'user-email', payload, attempts: 1 });

  assert.equal(pushed.length, 1);
  assert.deepEqual(emails.map((mail) => mail.to), ['user-email@example.com']);
  assert.deepEqual(removed, ['https://push.example/expired', 'https://push.example/expired']);
  assert.deepEqual(sent, ['job-push', 'job-email']);
});

test('une notification en échec est réessayée puis abandonnée après la dernière tentative', async (context) => {
  const retries = [];
  const failures = [];
  context.mock.method(mailer, 'isConfigured', () => true);
  context.mock.method(mailer, 'send', async () => { throw new Error('SMTP indisponible'); });
  context.mock.method(notificationRepository, 'markRetry', async (id, _error, availableAt) => { retries.push({ id, availableAt }); });
  context.mock.method(notificationRepository, 'markFailed', async (id) => { failures.push(id); });
  context.mock.method(console, 'error', () => {});

  const job = { id: 'job-a', channel: 'email', recipient: 'visiteur@example.com', payload: { subject: 'Sujet', text: 'Texte' } };
  await notificationWorker.processJob({ ...job, attempts: 1 });
  await notificationWorker.processJob({ ...job, attempts: env.notifications.maxAttempts });

  assert.equal(retries.length, 1);
  assert.ok(retries[0].availableAt > new Date());
  assert.deepEqual(failures, ['job-a']);
});

test('une demande de recontact prévient seulement les occupants du stand, sans données du visiteur', async (context) => {
  enableNotifications(context);
  const queued = [];
  context.mock.method(occupantRepository, 'findBySlug', async () => ({ id: 'occupant-a', name: 'Stand A' }));
  context.mock.method(contactRepository.sequelize, 'transaction', async (callback) => callback({}));
  context.mock.method(contactRepository, 'findExisting', async () => null);
  context.mock.method(contactRepository, 'create', async (values) => values);
  context.mock.method(notificationRepository, 'findStandUsers', async (occupantId, allowedRoles) => {
    assert.equal(occupantId, 'occupant-a');
    assert.deepEqual(allowedRoles, ['occupant']);
    return [{ id: 'occupant-user', firstName: 'Afi', email: 'afi@example.com' }];
  });
  context.mock.method(notificationRepository, 'enqueue', async (jobs) => { queued.push(...jobs); });

  await contactService.createPublic('stand-a', {
    id: crypto.randomUUID(), fullName: 'Visiteur Secret', phone: '+22890000000', need: 'Projet confidentiel', consentOccupant: true,
  });
  await flushNotifications();

  assert.equal(queued.length, 1);
  assert.equal(queued[0].channel, 'user');
  assert.equal(queued[0].recipient, 'occupant-user');
  const content = JSON.stringify(queued[0].payload);
  ['Visiteur Secret', '+22890000000', 'Projet confidentiel'].forEach((value) => assert.equal(content.includes(value), false));
});

test('une relance modifiée remplace la précédente et une date passée n’est pas planifiée', async (context) => {
  enableNotifications(context);
  const cancelled = [];
  const queued = [];
  context.mock.method(notificationRepository, 'cancelPending', async (key) => { cancelled.push(key); });
  context.mock.method(notificationRepository, 'findActiveUser', async (id) => ({ id, firstName: 'Afi', email: 'afi@example.com' }));
  context.mock.method(notificationRepository, 'enqueue', async (jobs) => { queued.push(...jobs); });

  const dueAt = new Date(Date.now() + 3600000);
  const contact = { id: 'contact-a', occupantId: 'occupant-a', fullName: 'Ama' };
  notificationService.contactFollowUpChanged({ id: 'follow-a', createdByUserId: 'occupant-user', reason: 'Envoyer le devis', dueAt }, contact);
  await flushNotifications();
  notificationService.contactFollowUpChanged({ id: 'follow-a', createdByUserId: 'occupant-user', reason: 'Envoyer le devis', dueAt: new Date(Date.now() - 1000) }, contact);
  await flushNotifications();

  assert.deepEqual(cancelled, ['contact-follow-up:follow-a', 'contact-follow-up:follow-a']);
  assert.equal(queued.length, 1);
  assert.equal(queued[0].dedupeKey, 'contact-follow-up:follow-a');
  assert.equal(queued[0].availableAt.getTime(), dueAt.getTime());
  assert.match(queued[0].payload.body, /Envoyer le devis/);
});

test('le stand à l’affiche couvre toute la journée et reste unique par jour', async (context) => {
  const created = [];
  let spotlightTaken = false;
  context.mock.method(programEventRepository, 'findOccupantById', async () => ({ id: 'occupant-a' }));
  context.mock.method(programEventRepository, 'findSpotlightOn', async () => (spotlightTaken ? { id: 'other' } : null));
  context.mock.method(programEventRepository, 'create', async (values) => {
    created.push(values);
    return { id: 'event-a', ...values };
  });
  context.mock.method(programEventRepository, 'findById', async (id) => ({ id, ...created.at(-1) }));

  await assert.rejects(
    programEventService.create({ type: 'spotlight', title: 'À l’affiche', startsAt: new Date('2026-10-15T00:00:00Z') }),
    (error) => error.status === 422 && error.code === 'OCCUPANT_REQUIRED',
  );

  await programEventService.create({
    type: 'spotlight', occupantId: 'occupant-a', title: 'À l’affiche', startsAt: new Date('2026-10-15T14:30:00Z'), endsAt: new Date('2026-10-15T16:00:00Z'),
  });
  assert.equal(created[0].startsAt.toISOString(), '2026-10-15T00:00:00.000Z');
  assert.equal(created[0].endsAt, null);

  spotlightTaken = true;
  await assert.rejects(
    programEventService.create({ type: 'spotlight', occupantId: 'occupant-a', title: 'À l’affiche', startsAt: new Date('2026-10-15T09:00:00Z') }),
    (error) => error.status === 409 && error.code === 'SPOTLIGHT_TAKEN',
  );
});

test('un élément du programme ne peut pas finir avant de commencer', async (context) => {
  context.mock.method(programEventRepository, 'create', async () => assert.fail('aucune création attendue'));
  await assert.rejects(
    programEventService.create({
      type: 'animation', title: 'Démonstration', startsAt: new Date('2026-10-15T15:00:00Z'), endsAt: new Date('2026-10-15T14:00:00Z'),
    }),
    (error) => error.status === 422 && error.code === 'INVALID_PERIOD',
  );
});

test('l’accueil sépare l’affiche, le programme du jour et les prochains rendez-vous', async (context) => {
  const now = new Date('2026-10-15T13:00:00Z');
  const calls = [];
  context.mock.method(programEventRepository, 'findPublicSpotlight', async (from, to) => {
    calls.push(['spotlight', from.toISOString(), to.toISOString()]);
    return { id: 's', type: 'spotlight', title: 'À l’affiche', occupant: { name: 'OTR', slug: 'otr' }, internalNote: 'x' };
  });
  context.mock.method(programEventRepository, 'findPublicBetween', async (from, to, limit) => {
    calls.push(['between', from.toISOString(), to?.toISOString() || null, limit || null]);
    return [];
  });

  const data = await programEventService.getToday('fr', now);

  assert.equal(data.date, '2026-10-15T00:00:00.000Z');
  assert.equal(data.spotlight.occupant.name, 'OTR');
  assert.equal(data.spotlight.internalNote, undefined);
  assert.deepEqual(calls, [
    ['spotlight', '2026-10-15T00:00:00.000Z', '2026-10-16T00:00:00.000Z'],
    ['between', '2026-10-15T00:00:00.000Z', '2026-10-16T00:00:00.000Z', null],
    ['between', '2026-10-16T00:00:00.000Z', null, 4],
  ]);
});

const realtimeService = require('../src/modules/realtime/realtime.service');

// Lit les événements SSE d'une réponse fetch jusqu'à obtenir le nombre demandé.
const readSseEvents = async (response, count, timeout = 2000) => {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const events = [];
  let buffer = '';
  const deadline = Date.now() + timeout;
  while (events.length < count && Date.now() < deadline) {
    const { value, done } = await Promise.race([
      reader.read(),
      new Promise((resolve) => { setTimeout(() => resolve({ value: null, done: false }), Math.max(1, deadline - Date.now())); }),
    ]);
    if (done) break;
    if (!value) continue;
    buffer += decoder.decode(value, { stream: true });
    let index = buffer.indexOf('\n\n');
    while (index !== -1) {
      const block = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      const event = block.split('\n').find((line) => line.startsWith('event: '));
      if (event) events.push(event.slice(7));
      index = buffer.indexOf('\n\n');
    }
  }
  reader.releaseLock();
  return events;
};

test('chaque rôle n’écoute que les canaux de son stand ou de son rôle', () => {
  assert.deepEqual(realtimeService.channelsFor({ id: 'u1', role: 'super-admin', occupantId: null }), ['user:u1', 'super-admin', 'apizf-team']);
  assert.deepEqual(realtimeService.channelsFor({ id: 'u2', role: 'admin', occupantId: 'stand-a' }), ['user:u2', 'super-admin', 'apizf-team']);
  assert.deepEqual(realtimeService.channelsFor({ id: 'u3', role: 'occupant', occupantId: 'stand-a' }), ['user:u3', 'admins', 'occupant:stand-a', 'admin:stand-a']);
  assert.deepEqual(realtimeService.channelsFor({ id: 'u4', role: 'animateur', occupantId: null }), ['user:u4', 'animateur']);
  assert.deepEqual(realtimeService.channelsFor({ id: 'u5', role: 'admin', occupantId: null }), ['user:u5', 'super-admin', 'apizf-team']);
  // Occupant du Stand API-ZF : son stand, plus les guichets et la roue de l'équipe API-ZF.
  assert.deepEqual(realtimeService.channelsFor({ id: 'u6', role: 'occupant', occupantId: 'stand-z', occupant: { space: 'apizf' } }), ['user:u6', 'apizf-team', 'admins', 'occupant:stand-z', 'admin:stand-z']);
});

test('un jeton de flux ne sert qu’une fois et expire', (context) => {
  const { ticket } = realtimeService.issueTicket({ id: 'user-a' });
  assert.equal(realtimeService.consumeTicket(ticket).userId, 'user-a');
  assert.throws(() => realtimeService.consumeTicket(ticket), (error) => error.status === 401 && error.code === 'REALTIME_TICKET_INVALID');

  const previousTtl = env.realtime.ticketTtl;
  env.realtime.ticketTtl = -1;
  context.after(() => { env.realtime.ticketTtl = previousTtl; });
  const expired = realtimeService.issueTicket({ id: 'user-a' });
  assert.throws(() => realtimeService.consumeTicket(expired.ticket), (error) => error.status === 401);
  assert.throws(() => realtimeService.consumeTicket(undefined), (error) => error.status === 401);
});

test('le flux d’un occupant reçoit les changements de son stand, jamais ceux d’un autre', async (context) => {
  const accounts = {
    'occupant-a-user': { id: 'occupant-a-user', occupantId: 'stand-a', role: 'occupant' },
    'occupant-b-user': { id: 'occupant-b-user', occupantId: 'stand-b', role: 'occupant' },
  };
  context.mock.method(User, 'findOne', async ({ where }) => {
    const account = accounts[where.id];
    return account ? { ...account, occupant: { status: 'active' }, toJSON: () => account } : null;
  });

  const server = app.listen(0, '127.0.0.1');
  const controllers = [];
  context.after(() => {
    controllers.forEach((controller) => controller.abort());
    realtimeService.closeAll();
    server.close();
  });
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/realtime`;

  const openStream = async (subject) => {
    const ticketResponse = await fetch(`${base}/ticket`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt.sign({}, env.auth.secret, { subject, expiresIn: '1h' })}` },
    });
    assert.equal(ticketResponse.status, 201);
    const { ticket } = (await ticketResponse.json()).data;
    const controller = new AbortController();
    controllers.push(controller);
    const response = await fetch(`${base}/stream?ticket=${encodeURIComponent(ticket)}`, { signal: controller.signal });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /^text\/event-stream/);
    assert.equal(response.headers.get('x-accel-buffering'), 'no');
    return { response, ticket };
  };

  const streamA = await openStream('occupant-a-user');
  const streamB = await openStream('occupant-b-user');
  assert.deepEqual(await readSseEvents(streamA.response, 1), ['ready']);
  assert.deepEqual(await readSseEvents(streamB.response, 1), ['ready']);

  realtimeService.events.contactsChanged('stand-a');
  assert.deepEqual(await readSseEvents(streamA.response, 1), ['contacts']);
  assert.deepEqual(await readSseEvents(streamB.response, 1, 200), []);

  const reused = await fetch(`${base}/stream?ticket=${encodeURIComponent(streamA.ticket)}`);
  assert.equal(reused.status, 401);

  const withoutSession = await fetch(`${base}/ticket`, { method: 'POST' });
  assert.equal(withoutSession.status, 401);
});

test('un passage validé prévient le stand, ses administrateurs, les animateurs et le participant', (context) => {
  const published = [];
  const hub = require('../src/modules/realtime/realtime.hub');
  context.mock.method(hub, 'publish', (channels, topic) => { published.push({ channels, topic }); return 0; });

  realtimeService.events.challengeChanged({ passportId: 'passport-a', occupantIds: ['stand-a', 'stand-a', null] });
  assert.equal(published.length, 1);
  assert.equal(published[0].topic, 'challenge');
  assert.deepEqual(
    published[0].channels.filter(Boolean).sort(),
    ['admin:stand-a', 'animateur', 'occupant:stand-a', 'passport:passport-a', 'screen', 'super-admin'],
  );

  published.length = 0;
  realtimeService.events.investorRequestsChanged();
  // Le grand écran est prévenu aussi : ses compteurs (rendez-vous aux guichets) changent.
  assert.deepEqual(published[0], { channels: ['apizf-team', 'screen'], topic: 'investor-requests' });
});

test('une diffusion en échec ne fait jamais échouer l’action métier', (context) => {
  const hub = require('../src/modules/realtime/realtime.hub');
  context.mock.method(hub, 'publish', () => { throw new Error('flux cassé'); });
  context.mock.method(console, 'error', () => {});
  assert.equal(realtimeService.events.contactsChanged('stand-a'), 0);
});

test('la liste des remises signale seulement celles de l’animateur connecté, sans exposer les autres comptes', async (context) => {
  context.mock.method(challengePassportRepository, 'findRedeemed', async () => [
    { id: 'p1', displayName: 'Ama Koffi', contact: '90000000', redeemedAt: '2026-11-03T10:00:00.000Z', redeemedByUserId: 'animator-a' },
    { id: 'p2', displayName: 'Kodjo Mensah', contact: 'kodjo@example.com', redeemedAt: '2026-11-03T09:00:00.000Z', redeemedByUserId: 'animator-b' },
  ]);

  const rewards = await challengePassportService.listRewards({ id: 'animator-a', role: 'animateur' });
  assert.deepEqual(rewards.map((reward) => reward.redeemedByMe), [true, false]);
  assert.ok(rewards.every((reward) => !('redeemedByUserId' in reward)));
  assert.deepEqual(Object.keys(rewards[0]).sort(), ['contact', 'displayName', 'email', 'id', 'phone', 'redeemedAt', 'redeemedByMe']);
});

const PLAYER = 'a'.repeat(64);
const OTHER_PLAYER = 'c'.repeat(64);
const wheelSetup = (context, { segments, code, plays = [] }) => {
  context.mock.method(wheelRepository.sequelize, 'transaction', async (callback) => callback({ LOCK: { UPDATE: 'UPDATE' } }));
  context.mock.method(wheelRepository, 'findPlayerByToken', async (token) => (token === PLAYER ? { id: 'passport-a' } : token === OTHER_PLAYER ? { id: 'passport-b' } : null));
  context.mock.method(wheelRepository, 'findCodeForUpdate', async (value) => (code && code.code === value ? code : null));
  context.mock.method(wheelRepository, 'findCodePlays', async () => plays.filter((play) => play.wheelCodeId === code?.id));
  context.mock.method(wheelRepository, 'findActiveSegmentsForUpdate', async () => segments.filter((segment) => segment.isActive));
  context.mock.method(wheelRepository, 'recordAward', async (segment) => { segment.awarded += 1; });
  context.mock.method(wheelRepository, 'createPlay', async (values) => { plays.push(values); return values; });
  return plays;
};

test('un code de la roue donne un seul tour par défaut et décompte le lot gagné', async (context) => {
  const prize = { id: 'p1', kind: 'prize', label: 'T-shirt', quantity: 2, awarded: 0, isActive: true };
  const lose = { id: 'l1', kind: 'lose', label: 'Presque !', quantity: null, awarded: 0, isActive: true };
  const code = { id: 'code-1', code: 'K7P2', spinsAllowed: 1 };
  const plays = wheelSetup(context, { segments: [prize, lose], code });

  const outcome = await wheelService.spin({ code: ' k7-p2 ', player: PLAYER }, 'fr', (length) => { assert.equal(length, 2); return 0; });
  assert.equal(outcome.result.id, 'p1');
  assert.deepEqual(Object.keys(outcome.result).sort(), ['id', 'kind', 'label']);
  assert.equal(outcome.spinsLeft, 0);
  assert.equal(prize.awarded, 1);
  assert.equal(plays.length, 1);
  assert.equal(plays[0].resultLabel, 'T-shirt');
  assert.equal(plays[0].passportId, 'passport-a');

  await assert.rejects(wheelService.spin({ code: 'K7P2', player: PLAYER }, 'fr', () => 0), (error) => error.status === 409 && error.code === 'WHEEL_CODE_USED');
  assert.equal(prize.awarded, 1);
});

test('un code à plusieurs tours reste au premier joueur et s’arrête au dernier tour', async (context) => {
  const lose = { id: 'l1', kind: 'lose', label: 'Dommage !', quantity: null, awarded: 0, isActive: true };
  const code = { id: 'code-2', code: 'M3X9', spinsAllowed: 2 };
  const plays = wheelSetup(context, { segments: [lose], code });

  assert.equal((await wheelService.spin({ code: 'M3X9', player: PLAYER }, 'fr', () => 0)).spinsLeft, 1);
  await assert.rejects(wheelService.spin({ code: 'M3X9', player: OTHER_PLAYER }, 'fr', () => 0), (error) => error.status === 409 && error.code === 'WHEEL_CODE_TAKEN');
  assert.equal((await wheelService.spin({ code: 'M3X9', player: PLAYER }, 'fr', () => 0)).spinsLeft, 0);
  await assert.rejects(wheelService.spin({ code: 'M3X9', player: PLAYER }, 'fr', () => 0), (error) => error.code === 'WHEEL_CODE_USED');
  assert.equal(plays.length, 2);
});

test('un code inventé ou un joueur non identifié ne fait pas tourner la roue', async (context) => {
  const lose = { id: 'l1', kind: 'lose', label: 'Dommage !', quantity: null, awarded: 0, isActive: true };
  const code = { id: 'code-3', code: 'ABCD', spinsAllowed: 1 };
  const plays = wheelSetup(context, { segments: [lose], code });

  await assert.rejects(wheelService.spin({ code: 'ZZZZ', player: PLAYER }, 'fr'), (error) => error.status === 404 && error.code === 'WHEEL_CODE_INVALID');
  await assert.rejects(wheelService.spin({ code: 'ABCD', player: 'b'.repeat(64) }, 'fr'), (error) => error.status === 422 && error.code === 'WHEEL_PLAYER_REQUIRED');
  assert.equal(plays.length, 0);
});

test('un lot épuisé ou désactivé disparaît de la roue, et une roue vide ne consomme pas le tour', async (context) => {
  const soldOut = { id: 'p1', kind: 'prize', label: 'Casquette', quantity: 3, awarded: 3, isActive: true };
  const inactive = { id: 'p2', kind: 'prize', label: 'Tablier', quantity: 5, awarded: 0, isActive: false };
  const code = { id: 'code-4', code: 'QWER', spinsAllowed: 1 };
  const plays = wheelSetup(context, { segments: [soldOut, inactive], code });

  await assert.rejects(wheelService.spin({ code: 'QWER', player: PLAYER }, 'fr', () => 0), (error) => error.status === 409 && error.code === 'WHEEL_EMPTY');
  assert.equal(plays.length, 0);

  const lose = { id: 'l1', kind: 'lose', label: 'Pas cette fois', quantity: null, awarded: 0, isActive: true };
  // Les mêmes méthodes simulées deux fois dans un test laissaient la première simulation en place après le test.
  context.mock.restoreAll();
  wheelSetup(context, { segments: [soldOut, inactive, lose], code });
  const outcome = await wheelService.spin({ code: 'QWER', player: PLAYER }, 'fr', (length) => { assert.equal(length, 1); return 0; });
  assert.deepEqual(outcome.segments.map((segment) => segment.id), ['l1']);
  assert.equal(soldOut.awarded, 3);
});

test('un nouveau code donne le nombre de tours réglé ; la fenêtre des codes distingue gagnants, perdants et non joués', async (context) => {
  context.mock.method(settingsService, 'wheelSpinsPerCode', () => 3);
  context.mock.method(wheelRepository, 'createCode', async (values) => ({ ...values }));
  const created = await wheelService.generateCode({ id: 'admin-1' });
  assert.equal(created.spinsAllowed, 3);
  assert.match(created.code, /^[A-HJ-NP-Z2-9]{4}$/);
  assert.deepEqual(Object.keys(created).sort(), ['code', 'spinsAllowed']);

  context.mock.method(wheelRepository, 'findSegments', async () => []);
  context.mock.method(wheelRepository, 'findPlays', async () => [{ id: 'play-1', resultKind: 'prize', resultLabel: 'T-shirt', playedAt: new Date(), wheelCode: { code: 'WIN1' } }]);
  context.mock.method(wheelRepository, 'findCodes', async () => [
    { id: 'c1', code: 'WIN1', spinsAllowed: 2, plays: [{ resultKind: 'lose' }, { resultKind: 'prize' }] },
    { id: 'c2', code: 'LOS1', spinsAllowed: 1, plays: [{ resultKind: 'lose' }] },
    { id: 'c3', code: 'NEW1', spinsAllowed: 1, plays: [] },
  ]);
  const overview = await wheelService.overview();
  assert.deepEqual(overview.codes.map((item) => [item.code, item.outcome, item.spinsUsed]), [['WIN1', 'won', 2], ['LOS1', 'lost', 1], ['NEW1', null, 0]]);
  assert.deepEqual(overview.plays.map((item) => [item.code, item.result.label]), [['WIN1', 'T-shirt']]);
  assert.equal(overview.stats.played, 1);
});

test('les lots gagnés avec un même code se remettent un par un, puis le code est signalé comme déjà remis', async (context) => {
  const prizes = [
    { id: 'play-1', resultKind: 'prize', resultLabel: 'T-shirt', claimedAt: null, wheelCode: { code: 'WIN1' } },
    { id: 'play-2', resultKind: 'prize', resultLabel: 'Casquette', claimedAt: null, wheelCode: { code: 'WIN1' } },
  ];
  context.mock.method(wheelRepository.sequelize, 'transaction', async (callback) => callback({ LOCK: { UPDATE: 'UPDATE' } }));
  context.mock.method(wheelRepository, 'findCodePrizes', async () => prizes);
  context.mock.method(wheelRepository, 'updatePlay', async (play, values) => Object.assign(play, values));
  const staff = { id: 'user-1', firstName: 'Ama', lastName: 'Koffi' };

  assert.equal((await wheelService.findPrize('win1')).result.label, 'T-shirt');
  assert.equal((await wheelService.claimPrize(staff, 'WIN1')).result.label, 'T-shirt');
  assert.equal((await wheelService.claimPrize(staff, 'WIN1')).result.label, 'Casquette');
  await assert.rejects(wheelService.claimPrize(staff, 'WIN1'), (error) => error.code === 'WHEEL_PRIZE_ALREADY_CLAIMED' && error.details.result.label === 'Casquette');
});

const seoService = require('../src/modules/seo/seo.service');
const seoRepository = require('../src/modules/seo/seo.repository');

test('les espaces privés et liens personnels ne sont jamais indexés', async () => {
  for (const page of ['/connexion', '/administration', '/administration/stands', '/espace-occupant/defis', '/studio/abc', `/defis/${'a'.repeat(64)}`]) {
    const meta = await seoService.pageMeta(page);
    assert.equal(meta.robots, 'noindex, nofollow', page);
    assert.equal(meta.canonical, undefined, page);
  }
});

test('la roue renvoie vers la page Défis et une page inconnue répond 404', async () => {
  assert.equal((await seoService.pageMeta('/roue')).canonical, '/defis');
  assert.equal((await seoService.pageMeta('/stands/')).canonical, '/stands');
  const missing = await seoService.pageMeta('/nimporte-quoi');
  assert.equal(missing.status, 404);
  assert.equal(missing.robots, 'noindex');
});

test('la fiche d’un stand reprend son nom, son activité et son image', async (context) => {
  context.mock.method(seoRepository, 'findStand', async () => ({ name: 'PIA', slug: 'pia', standLabel: 'Pavillon 2', activity: 'Aménagement <industriel>', coverImageUrl: '/uploads/covers/pia.jpg' }));
  const meta = await seoService.pageMeta('/stands/pia');
  assert.equal(meta.title, 'PIA · Entreprises · Hub de l’Investissement');
  assert.match(meta.description, /^PIA au Hub de l’Investissement \(Pavillon 2\) : Aménagement/);
  assert.match(meta.image, /\/uploads\/covers\/pia\.jpg$/);
  const tags = seoService.renderTags(meta);
  assert.match(tags, /&lt;industriel&gt;/);
  assert.doesNotMatch(tags, /<industriel>/);
});

test('une description trop longue est coupée sur un mot', () => {
  const text = `${'investissement '.repeat(20)}fin`;
  const summary = seoService.summarize(text);
  assert.ok(summary.length <= 160);
  assert.match(summary, /investissement…$/);
});

test('pour jouer, un nom complet et un e-mail ou un téléphone suffisent', () => {
  const { createPublic } = require('../src/modules/challenge-passport/challenge-passport.validation');
  assert.equal(createPublic.validate({ fullName: 'Afi Mensah', contact: 'AFI@Example.com' }).value.contact, 'afi@example.com');
  assert.equal(createPublic.validate({ fullName: 'Afi Mensah', contact: '+22890000000' }).error, undefined);
  assert.ok(createPublic.validate({ fullName: 'Afi Mensah', contact: 'pas un contact' }).error);
  assert.ok(createPublic.validate({ fullName: 'Afi Mensah' }).error);
});

const settingsService = require('../src/modules/settings/settings.service');
const settingsValidation = require('../src/modules/settings/settings.validation');
const { AppSetting } = require('../src/models');

test('un module fermé depuis l’administration refuse les actions publiques', async (context) => {
  context.after(() => settingsService._reset());
  context.mock.method(AppSetting, 'findAll', async () => [{ key: 'investorDeskOpen', value: false }, { key: 'requiredPassages', value: 5 }]);
  await settingsService.load();
  await assert.rejects(investorRequestService.createPublic({}), (error) => error.code === 'MODULE_CLOSED' && error.status === 403);
  assert.doesNotThrow(() => settingsService.assertOpen('b2bOpen'));
  assert.equal(settingsService.requiredPassages(), 5);
  assert.equal(settingsService.publicSettings().investorDeskOpen, false);
});

test('les réglages refusent un stock négatif, le nombre d’étapes (fixe) et une clé inconnue', () => {
  assert.ok(settingsValidation.update.validate({ challengeRewardStock: -1 }).error);
  assert.ok(settingsValidation.update.validate({ requiredPassages: 4 }).error);
  assert.ok(settingsValidation.update.validate({ inconnu: true }).error);
  assert.ok(settingsValidation.update.validate({}).error);
  assert.equal(settingsValidation.update.validate({ wheelOpen: false, challengeRewardStock: 200 }).error, undefined);
});

test('pas de limite de parties : un joueur qui a déjà joué aujourd’hui rejoue avec un nouveau code', async (context) => {
  const prize = { id: 'p1', kind: 'prize', label: 'T-shirt', quantity: 2, awarded: 0, isActive: true };
  const code = { code: 'AB23', usedAt: null, expiresAt: new Date(Date.now() + 60000) };
  // Aucun comptage des parties du jour : le tirage se fait sans vérifier combien le joueur en a déjà joué.
  wheelSetup(context, { segments: [prize], code });
  const result = await wheelService.spin({ code: 'AB23', player: PLAYER }, 'fr', () => 0);
  assert.equal(result.result.label, 'T-shirt');
});

test('un lot gagné ne se remet qu’une fois, et seulement s’il a été gagné', async (context) => {
  const won = { id: 'play-w', resultKind: 'prize', resultLabel: 'Casquette', claimedAt: null, player: { displayName: 'Ama' }, wheelCode: { code: 'WIN2' } };
  const codes = { WIN2: { id: 'code-w', plays: 1 }, LOS3: { id: 'code-l', plays: 1 }, NEW4: { id: 'code-n', plays: 0 } };
  context.mock.method(wheelRepository.sequelize, 'transaction', async (callback) => callback({ LOCK: { UPDATE: 'UPDATE' } }));
  context.mock.method(wheelRepository, 'findCodePrizes', async (value) => (value === 'WIN2' ? [won] : []));
  context.mock.method(wheelRepository, 'findCodeByValue', async (value) => (codes[value] ? { id: codes[value].id } : null));
  context.mock.method(wheelRepository, 'countPlays', async (id) => Object.values(codes).find((item) => item.id === id).plays);
  context.mock.method(wheelRepository, 'updatePlay', async (play, values) => Object.assign(play, values));
  const user = { id: 'animateur-a', firstName: 'Kossi', lastName: 'A.' };

  const claimed = await wheelService.claimPrize(user, 'win2');
  assert.equal(claimed.result.label, 'Casquette');
  assert.equal(claimed.player.displayName, 'Ama');
  assert.ok(won.claimedAt);
  assert.equal(won.claimedByUserId, 'animateur-a');
  await assert.rejects(wheelService.claimPrize(user, 'WIN2'), (error) => error.code === 'WHEEL_PRIZE_ALREADY_CLAIMED');
  await assert.rejects(wheelService.claimPrize(user, 'LOS3'), (error) => error.code === 'WHEEL_NO_PRIZE');
  await assert.rejects(wheelService.findPrize('NEW4'), (error) => error.code === 'WHEEL_NOT_PLAYED');
  await assert.rejects(wheelService.claimPrize(user, 'NOPE'), (error) => error.code === 'WHEEL_CODE_INVALID');
});

test('le bouton « Remis » de l’historique remet le lot de ce tour, une fois, et jamais un tour perdu', async (context) => {
  const plays = {
    won: { id: 'won', resultKind: 'prize', resultLabel: 'T-shirt', claimedAt: null, wheelCode: { code: 'WIN5' } },
    lost: { id: 'lost', resultKind: 'lose', resultLabel: 'Presque !', claimedAt: null, wheelCode: { code: 'LOS5' } },
  };
  context.mock.method(wheelRepository.sequelize, 'transaction', async (callback) => callback({ LOCK: { UPDATE: 'UPDATE' } }));
  context.mock.method(wheelRepository, 'findPlayForClaim', async (id) => plays[id] || null);
  context.mock.method(wheelRepository, 'updatePlay', async (play, values) => Object.assign(play, values));
  const user = { id: 'admin-a', firstName: 'Ama', lastName: 'K.' };

  const claimed = await wheelService.claimPlay(user, 'won');
  assert.equal(claimed.result.label, 'T-shirt');
  assert.deepEqual(claimed.claimedBy, { firstName: 'Ama', lastName: 'K.' });
  assert.equal(plays.won.claimedByUserId, 'admin-a');
  await assert.rejects(wheelService.claimPlay(user, 'won'), (error) => error.code === 'WHEEL_PRIZE_ALREADY_CLAIMED');
  await assert.rejects(wheelService.claimPlay(user, 'lost'), (error) => error.code === 'WHEEL_NO_PRIZE');
  await assert.rejects(wheelService.claimPlay(user, 'absent'), (error) => error.status === 404);
});

test('supprimer une partie rend au stock un lot pas encore remis, jamais un lot déjà remis', async (context) => {
  const plays = {
    toHand: { id: 'toHand', resultKind: 'prize', segmentId: 'seg-1', claimedAt: null },
    handed: { id: 'handed', resultKind: 'prize', segmentId: 'seg-1', claimedAt: new Date() },
    lost: { id: 'lost', resultKind: 'lose', segmentId: 'seg-2', claimedAt: null },
  };
  const released = [];
  const removed = [];
  context.mock.method(wheelRepository.sequelize, 'transaction', async (callback) => callback({ LOCK: { UPDATE: 'UPDATE' } }));
  context.mock.method(wheelRepository, 'findPlayForClaim', async (id) => plays[id] || null);
  context.mock.method(wheelRepository, 'releaseAward', async (segmentId) => { released.push(segmentId); });
  context.mock.method(wheelRepository, 'removePlay', async (play) => { removed.push(play.id); });

  for (const id of ['toHand', 'handed', 'lost']) await wheelService.removePlay(id);
  assert.deepEqual(removed, ['toHand', 'handed', 'lost']);
  assert.deepEqual(released, ['seg-1']);
  await assert.rejects(wheelService.removePlay('absent'), (error) => error.status === 404);
});

test('supprimer un participant rafraîchit les stands qu’il a traversés', async (context) => {
  const removed = [];
  const published = [];
  context.mock.method(challengePassportRepository, 'findById', async (id) => (id === 'p1' ? { id: 'p1' } : null));
  context.mock.method(challengePassportRepository, 'findOccupantIds', async () => ['stand-a', 'stand-b']);
  context.mock.method(challengePassportRepository, 'remove', async (passport) => { removed.push(passport.id); });
  context.mock.method(realtimeService.events, 'challengeChanged', (payload) => { published.push(payload); });

  await challengePassportService.remove('p1');
  assert.deepEqual(removed, ['p1']);
  assert.deepEqual(published, [{ passportId: 'p1', occupantIds: ['stand-a', 'stand-b'] }]);
  await assert.rejects(challengePassportService.remove('absent'), (error) => error.status === 404);
});

test('un contact de stand se qualifie A, B ou C ; les anciennes valeurs chaud, tiède, froid sont refusées', () => {
  const contactValidation = require('../src/modules/contact/contact.validation');
  assert.equal(contactValidation.update.validate({ qualification: 'b' }).value.qualification, 'B');
  assert.ok(contactValidation.update.validate({ qualification: 'hot' }).error);
  assert.ok(contactValidation.query.validate({ qualification: 'D' }).error);
});

const b2bMeetingService = require('../src/modules/b2b-proposal/b2b-meeting.service');
const b2bMeetingRepository = require('../src/modules/b2b-proposal/b2b-meeting.repository');

const meetingSetup = (context, { status = 'accepted', occupantId = 'stand-a', existing = [] } = {}) => {
  const proposal = { id: 'prop-1', status, need: { occupantId, title: 'Emballages', occupant: { id: occupantId, name: 'WAFO' } }, email: 'kossi@example.com', language: 'fr' };
  const created = [];
  context.mock.method(b2bProposalService, 'getManaged', async () => proposal);
  context.mock.method(b2bMeetingRepository.sequelize, 'transaction', async (callback) => callback({}));
  context.mock.method(b2bMeetingRepository, 'lockSchedule', async () => {});
  context.mock.method(b2bMeetingRepository, 'findStartingBetween', async () => existing);
  context.mock.method(b2bMeetingRepository, 'create', async (values) => { created.push(values); return values; });
  context.mock.method(notificationService, 'b2bMeetingScheduled', () => {});
  return { proposal, created };
};

const futureDay = () => new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const busyMeeting = (startsAt, tableNumber, occupantId) => ({ id: `m-${tableNumber}`, startsAt: new Date(startsAt), durationMinutes: 20, tableNumber, proposal: { need: { occupantId } } });

test('un rendez-vous B2B se fixe sur une demande acceptée, une table libre et un stand libre', async (context) => {
  const day = futureDay();
  const { created } = meetingSetup(context, { existing: [busyMeeting(`${day}T10:00:00Z`, 1, 'stand-b')] });

  await assert.rejects(b2bMeetingService.schedule({ id: 'u1' }, 'prop-1', { startsAt: `${day}T10:00:00Z`, tableNumber: 1 }), (error) => error.code === 'B2B_TABLE_TAKEN');
  await assert.rejects(b2bMeetingService.schedule({ id: 'u1' }, 'prop-1', { startsAt: `${day}T10:00:00Z`, tableNumber: 9 }), (error) => error.code === 'B2B_TABLE_UNKNOWN');
  await assert.rejects(b2bMeetingService.schedule({ id: 'u1' }, 'prop-1', { startsAt: '2020-01-01T10:00:00Z', tableNumber: 2 }), (error) => error.code === 'B2B_MEETING_IN_PAST');

  const meeting = await b2bMeetingService.schedule({ id: 'u1' }, 'prop-1', { startsAt: `${day}T10:00:00Z`, tableNumber: 2 });
  assert.equal(meeting.tableNumber, 2);
  assert.equal(meeting.durationMinutes, 20);
  assert.equal(created.length, 1);
});

test('un stand ne peut pas avoir deux rendez-vous B2B en même temps, et une demande non acceptée n’en reçoit pas', async (context) => {
  const day = futureDay();
  meetingSetup(context, { existing: [busyMeeting(`${day}T10:10:00Z`, 3, 'stand-a')] });
  await assert.rejects(b2bMeetingService.schedule({ id: 'u1' }, 'prop-1', { startsAt: `${day}T10:00:00Z`, tableNumber: 1 }), (error) => error.code === 'B2B_STAND_BUSY');

  // Les mêmes méthodes simulées deux fois dans un test laissaient la première simulation en place après le test.
  context.mock.restoreAll();
  meetingSetup(context, { status: 'pending' });
  await assert.rejects(b2bMeetingService.schedule({ id: 'u1' }, 'prop-1', { startsAt: `${day}T10:00:00Z`, tableNumber: 1 }), (error) => error.code === 'B2B_PROPOSAL_NOT_ACCEPTED');
});

test('les créneaux libres d’une journée suivent les réglages et écartent tables prises et stand occupé', async (context) => {
  const day = futureDay();
  meetingSetup(context, { existing: [busyMeeting(`${day}T09:00:00Z`, 1, 'stand-b'), busyMeeting(`${day}T09:20:00Z`, 2, 'stand-a')] });
  const result = await b2bMeetingService.slots({ id: 'u1' }, 'prop-1', day);
  assert.equal(result.minutes, 20);
  assert.equal(result.slots.length, 23);
  assert.deepEqual(result.slots[0], { startsAt: `${day}T09:00:00.000Z`, tables: [2, 3, 4] });
  assert.equal(result.slots[1].startsAt, `${day}T09:40:00.000Z`);
  assert.equal(result.slots.at(-1).startsAt, `${day}T16:40:00.000Z`);
});

test('un rendez-vous B2B se déplace sur un créneau libre, sans se gêner lui-même, et plus une fois son compte rendu fait', async (context) => {
  const day = futureDay();
  const meeting = { id: 'm1', startsAt: new Date(`${day}T10:00:00Z`), durationMinutes: 20, tableNumber: 1, outcome: null };
  const reported = { id: 'm2', startsAt: new Date(Date.now() - 60000), durationMinutes: 20, tableNumber: 2, outcome: 'no_show' };
  meetingSetup(context, { existing: [{ ...meeting, proposal: { need: { occupantId: 'stand-a' } } }, busyMeeting(`${day}T11:00:00Z`, 3, 'stand-b')] });
  context.mock.method(b2bMeetingRepository, 'findById', async (id) => ({ m1: meeting, m2: reported })[id] || null);
  context.mock.method(b2bMeetingRepository, 'update', async (item, values) => Object.assign(item, values));
  const moved = [];
  context.mock.method(notificationService, 'b2bMeetingMoved', (item) => { moved.push(item.id); });

  await b2bMeetingService.reschedule({ id: 'u1' }, 'prop-1', 'm1', { startsAt: `${day}T10:10:00Z`, tableNumber: 1 });
  assert.equal(meeting.startsAt.toISOString(), `${day}T10:10:00.000Z`);
  assert.deepEqual(moved, ['m1']);
  await assert.rejects(b2bMeetingService.reschedule({ id: 'u1' }, 'prop-1', 'm1', { startsAt: `${day}T11:00:00Z`, tableNumber: 3 }), (error) => error.code === 'B2B_TABLE_TAKEN');
  await assert.rejects(b2bMeetingService.reschedule({ id: 'u1' }, 'prop-1', 'm2', { startsAt: `${day}T12:00:00Z`, tableNumber: 1 }), (error) => error.code === 'B2B_MEETING_REPORTED');
});

test('le compte rendu en un clic ne se fait qu’une fois le rendez-vous commencé ; la note reste libre', async (context) => {
  meetingSetup(context);
  const past = { id: 'm1', startsAt: new Date(Date.now() - 60000) };
  const future = { id: 'm2', startsAt: new Date(Date.now() + 3600000) };
  const saved = {};
  context.mock.method(b2bMeetingRepository, 'findById', async (id) => ({ m1: past, m2: future })[id] || null);
  context.mock.method(b2bMeetingRepository, 'update', async (meeting, values) => { saved[meeting.id] = values; return meeting; });

  await b2bMeetingService.report({ id: 'u1' }, 'prop-1', 'm1', { outcome: 'held_follow_up', note: 'Devis à envoyer' });
  assert.equal(saved.m1.outcome, 'held_follow_up');
  assert.equal(saved.m1.reportedByUserId, 'u1');
  assert.equal(saved.m1.note, 'Devis à envoyer');
  await assert.rejects(b2bMeetingService.report({ id: 'u1' }, 'prop-1', 'm2', { outcome: 'no_show' }), (error) => error.code === 'B2B_MEETING_NOT_STARTED');
  await b2bMeetingService.report({ id: 'u1' }, 'prop-1', 'm2', { note: 'Apporter le catalogue' });
  assert.equal(saved.m2.note, 'Apporter le catalogue');
  await assert.rejects(b2bMeetingService.report({ id: 'u1' }, 'prop-1', 'absent', { note: 'x' }), (error) => error.status === 404);
});

// Relances en mémoire : création, recherche, mise à jour, suppression.
const investorSetup = (context, { request, followUps = [] }) => {
  const saved = [];
  const reminders = [];
  const removed = [];
  const store = followUps;
  let sequence = 0;
  context.mock.method(investorRequestRepository, 'findById', async () => request);
  context.mock.method(investorRequestRepository, 'update', async (item, values) => { saved.push(values); return Object.assign(item, values); });
  context.mock.method(investorRequestRepository, 'countFollowUps', async () => store.length);
  context.mock.method(investorRequestRepository, 'findTeamMember', async (id) => (id === 'apizf-1' ? { id } : null));
  context.mock.method(investorRequestRepository, 'createFollowUp', async (values) => { const item = { id: `fu-${++sequence}`, doneAt: null, autoSource: null, ...values }; store.push(item); return item; });
  context.mock.method(investorRequestRepository, 'findFollowUp', async (id) => store.find((item) => item.id === id) || null);
  context.mock.method(investorRequestRepository, 'updateFollowUp', async (item, values) => Object.assign(item, values));
  context.mock.method(investorRequestRepository, 'destroyFollowUp', async (item) => { store.splice(store.indexOf(item), 1); });
  context.mock.method(investorRequestRepository, 'findPendingFollowUps', async (_id, { sources = null } = {}) => store
    .filter((item) => !item.doneAt && (!sources || sources.includes(item.autoSource)))
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt)));
  context.mock.method(notificationService, 'investorFollowUpChanged', (item) => { reminders.push(item); });
  context.mock.method(notificationService, 'investorFollowUpRemoved', (item) => { removed.push(item); });
  return { saved, reminders, removed, store };
};

test('Guichets : la classe A crée une relance sous 48 h, B la remplace sous 7 jours, C la retire', async (context) => {
  const request = { id: 'ir-1', classification: null, status: 'new' };
  const { store, reminders } = investorSetup(context, { request });
  const before = Date.now();

  await investorRequestService.update('ir-1', { classification: 'A' });
  assert.equal(store.length, 1);
  assert.equal(store[0].autoSource, 'A');
  const dueA = new Date(store[0].dueAt).getTime() - before;
  assert.ok(dueA >= 48 * 3600000 && dueA < 48 * 3600000 + 5000);
  assert.equal(request.status, 'in_progress');
  assert.equal(request.nextFollowUpAt, store[0].dueAt);
  assert.equal(reminders.length, 1);

  await investorRequestService.update('ir-1', { classification: 'B' });
  assert.equal(store.length, 1);
  assert.equal(store[0].autoSource, 'B');
  const dueB = new Date(store[0].dueAt).getTime() - before;
  assert.ok(dueB >= 7 * 24 * 3600000 && dueB < 7 * 24 * 3600000 + 5000);

  await investorRequestService.update('ir-1', { classification: 'C' });
  assert.equal(store.length, 0);
  assert.equal(request.nextFollowUpAt, null);
  assert.equal(request.status, 'closed');
  assert.equal(investorRequestService.progressStatus({ nextFollowUpAt: null, classification: null }, false), 'new');
});

test('Guichets : le responsable est un membre de l’équipe API-ZF ; le diagnostic ne garde que les informations réglées et exige l’étape suivante', async (context) => {
  const request = { id: 'ir-2', classification: 'B', status: 'in_progress', diagnosedAt: null };
  const { saved } = investorSetup(context, { request });
  await assert.rejects(investorRequestService.update('ir-2', { contactUserId: 'stand-admin' }), (error) => error.code === 'INVESTOR_CONTACT_INVALID');
  await investorRequestService.update('ir-2', { contactUserId: 'apizf-1' });
  assert.equal(request.contactUserId, 'apizf-1');

  assert.ok(investorRequestValidation.diagnosis.validate({ qualification: {} }).error);
  await investorRequestService.saveDiagnosis('ir-2', { qualification: { sector: 'Industrie', jobs: '25', agreement: 'yes', unknown: 'x', origin: '' }, nextAction: 'Rendez-vous au guichet régimes' });
  assert.deepEqual(saved.at(-1).qualification, { sector: 'Industrie', jobs: 25, agreement: true });
  const firstDiagnosis = request.diagnosedAt;
  assert.ok(firstDiagnosis instanceof Date);
  await investorRequestService.saveDiagnosis('ir-2', { qualification: {}, nextAction: 'Envoyer l’Investor Pack' });
  assert.equal(request.diagnosedAt, firstDiagnosis);
});

test('Guichets : une relance s’ajoute (date et motif), se marque faite avec sa prochaine étape, et reste à faire sinon', async (context) => {
  const request = { id: 'ir-3', classification: null, status: 'new' };
  const { store, reminders, removed } = investorSetup(context, { request });
  await assert.rejects(investorRequestService.addFollowUp({ id: 'u1' }, 'ir-3', { dueAt: new Date(Date.now() - 60000), reason: 'Rappeler' }), (error) => error.code === 'INVESTOR_FOLLOW_UP_IN_PAST');

  const due = new Date(Date.now() + 3 * 24 * 3600000);
  const followUp = await investorRequestService.addFollowUp({ id: 'u1' }, 'ir-3', { dueAt: due, reason: 'Envoyer l’Investor Pack' });
  assert.equal(followUp.createdByUserId, 'u1');
  assert.equal(request.status, 'in_progress');
  assert.equal(request.nextFollowUpAt, due);
  assert.equal(reminders.length, 1);

  // « Relancer » : la relance est faite et la suivante est créée.
  const later = new Date(Date.now() + 5 * 24 * 3600000);
  await investorRequestService.completeFollowUp({ id: 'u1' }, 'ir-3', followUp.id, { outcome: 'again', next: { dueAt: later, reason: 'Récupérer le business plan' } });
  assert.ok(followUp.doneAt instanceof Date);
  assert.equal(followUp.outcome, 'again');
  assert.equal(removed.length, 1);
  assert.equal(store.length, 2);
  assert.equal(request.nextFollowUpAt, later);
  await assert.rejects(investorRequestService.completeFollowUp({ id: 'u1' }, 'ir-3', followUp.id, { outcome: 'closed' }), (error) => error.code === 'INVESTOR_FOLLOW_UP_DONE');

  // « Autre » : un texte ; plus rien à faire, le contact est terminé.
  await investorRequestService.completeFollowUp({ id: 'u1' }, 'ir-3', store[1].id, { outcome: 'other', note: 'Attend le retour de son associé' });
  assert.equal(store[1].outcomeNote, 'Attend le retour de son associé');
  assert.equal(request.nextFollowUpAt, null);
  assert.equal(request.status, 'closed');

  // Une relance faite reste si la classe change ; la classe B ajoute sa relance automatique.
  await investorRequestService.update('ir-3', { classification: 'B' });
  assert.equal(store.length, 3);
  assert.equal(request.status, 'in_progress');

  // Supprimer retire la relance et son alerte.
  await investorRequestService.removeFollowUp('ir-3', store[2].id);
  assert.equal(store.length, 2);
  assert.equal(request.status, 'closed');
  assert.ok(investorRequestValidation.followUpDone.validate({ outcome: 'other' }).error);
  assert.ok(investorRequestValidation.followUpDone.validate({ outcome: 'again' }).error);
});

test('Guichets : la fiche « Mon entreprise, mes difficultés » passe en Accompagnement ; la date de réponse promise crée une relance, faite à la réponse', async (context) => {
  const request = { id: 'ir-4', classification: null, status: 'new', email: 'dg@usine.tg', commitmentNote: null, commitmentDueAt: null, commitmentService: null, resolvedAt: null, language: 'fr' };
  const { store, reminders } = investorSetup(context, { request });
  const difficulty = { company: 'Usine du Golfe', regime: 'free_zone', nature: 'Dédouanement', description: 'Retards à l’import des intrants.' };

  await investorRequestService.saveDifficulty('ir-4', { difficulty });
  assert.equal(request.classification, 'support');
  assert.equal(request.status, 'new');
  assert.equal(store.length, 0);

  await assert.rejects(investorRequestService.saveDifficulty('ir-4', { difficulty, commitmentNote: 'Rendez-vous avec la douane' }), (error) => error.code === 'COMMITMENT_INCOMPLETE');
  const due = new Date(Date.now() + 10 * 24 * 3600000);
  await investorRequestService.saveDifficulty('ir-4', { difficulty, commitmentService: 'aftercare', commitmentDueAt: due, commitmentNote: 'Rendez-vous avec la douane' });
  assert.equal(request.status, 'in_progress');
  assert.equal(store.length, 1);
  assert.equal(store[0].autoSource, 'commitment');
  assert.equal(store[0].reason, 'Réponse promise : Rendez-vous avec la douane');
  assert.equal(new Date(store[0].dueAt).getUTCHours(), 9);
  assert.equal(reminders.length, 1);

  // Le même engagement réenregistré ne recrée pas sa relance ; une nouvelle date la remplace.
  await investorRequestService.saveDifficulty('ir-4', { difficulty, commitmentService: 'aftercare', commitmentDueAt: due, commitmentNote: 'Rendez-vous avec la douane' });
  assert.equal(store.length, 1);
  const later = new Date(due.getTime() + 2 * 24 * 3600000);
  await investorRequestService.saveDifficulty('ir-4', { difficulty, commitmentService: 'aftercare', commitmentDueAt: later, commitmentNote: 'Rendez-vous avec la douane' });
  assert.equal(store.length, 1);
  assert.equal(new Date(store[0].dueAt).getUTCDate(), later.getUTCDate());

  // Réponse donnée : la relance est marquée faite et le contact est terminé.
  await investorRequestService.resolve('ir-4', { resolved: true });
  assert.ok(store[0].doneAt);
  assert.equal(store[0].outcome, 'closed');
  assert.equal(request.status, 'closed');

  // Engagement verrouillé tant qu'on ne le rouvre pas ; la fiche des difficultés reste modifiable.
  await assert.rejects(investorRequestService.saveDifficulty('ir-4', { difficulty, commitmentService: 'aftercare', commitmentDueAt: later, commitmentNote: 'Autre engagement' }), (error) => error.code === 'COMMITMENT_LOCKED');
  await investorRequestService.saveDifficulty('ir-4', { difficulty: { ...difficulty, nature: 'Douane' }, commitmentService: 'aftercare', commitmentDueAt: later, commitmentNote: 'Rendez-vous avec la douane' });
  assert.equal(request.difficulty.nature, 'Douane');
});

test('Guichets : un rendez-vous se réserve sur un créneau proposé, une seule fois par guichet', async (context) => {
  const day = new Date(Date.now() + 3 * 24 * 3600000).toISOString().slice(0, 10);
  context.mock.method(settingsService, 'guichetSchedule', () => ({ firstDay: day, lastDay: day, dayStart: '09:00', dayEnd: '10:00', minutes: 15 }));
  context.mock.method(investorRequestRepository, 'findGuichetMeetingsBetween', async () => [{ startsAt: new Date(`${day}T09:15:00Z`) }]);
  const { slots } = await investorRequestService.publicSlots('regime');
  assert.deepEqual(slots, [`${day}T09:00:00.000Z`, `${day}T09:30:00.000Z`, `${day}T09:45:00.000Z`]);

  const values = { guichet: 'regime', fullName: 'Kossi Mensah', email: 'K@b.tg', projectSummary: 'Usine de transformation de soja.' };
  await assert.rejects(investorRequestService.book({ ...values, startsAt: `${day}T09:10:00Z` }), (error) => error.code === 'GUICHET_SLOT_INVALID');
  context.mock.method(investorRequestRepository, 'createWithMeeting', async () => { throw new UniqueConstraintError({}); });
  await assert.rejects(investorRequestService.book({ ...values, startsAt: `${day}T09:30:00Z` }), (error) => error.code === 'GUICHET_SLOT_TAKEN');

  const sent = [];
  context.mock.method(investorRequestRepository, 'createWithMeeting', async (request, meeting) => ({ investorRequest: request, meeting }));
  context.mock.method(notificationService, 'investorRequestReceived', (item) => { sent.push(item.source); });
  context.mock.method(notificationService, 'investorMeetingChanged', (kind) => { sent.push(kind); });
  const result = await investorRequestService.book({ ...values, startsAt: `${day}T09:30:00Z` }, 'fr');
  assert.equal(result.location, 'Stand API-ZF · guichet « Quel régime pour mon investissement ? »');
  assert.deepEqual(sent, ['online_booking', 'scheduled']);
});



test('Investor Desk : un rendez-vous se valide après son heure, s’annule en prévenant l’investisseur, puis ne bouge plus', async (context) => {
  const request = { id: 'ir-9', email: 'a@b.tg' };
  const past = { id: 'm-past', startsAt: new Date(Date.now() - 60000), status: 'scheduled' };
  const future = { id: 'm-future', startsAt: new Date(Date.now() + 3600000), status: 'scheduled' };
  const emails = [];
  context.mock.method(investorRequestRepository, 'findById', async () => request);
  context.mock.method(investorRequestRepository, 'findMeeting', async (id) => ({ 'm-past': past, 'm-future': future })[id] || null);
  context.mock.method(investorRequestRepository, 'updateMeeting', async (meeting, values) => Object.assign(meeting, values));
  context.mock.method(notificationService, 'investorMeetingChanged', (kind) => { emails.push(kind); });

  await assert.rejects(investorRequestService.setMeetingStatus('ir-9', 'm-future', 'held'), (error) => error.code === 'INVESTOR_MEETING_NOT_STARTED');
  await investorRequestService.setMeetingStatus('ir-9', 'm-past', 'held');
  assert.equal(past.status, 'held');
  await investorRequestService.setMeetingStatus('ir-9', 'm-future', 'cancelled');
  assert.deepEqual(emails, ['cancelled']);
  await assert.rejects(investorRequestService.updateMeeting('ir-9', 'm-future', { startsAt: new Date(Date.now() + 7200000), location: 'Hub' }), (error) => error.code === 'INVESTOR_MEETING_CLOSED');
});

const liveQuestionService = require('../src/modules/live-question/live-question.service');
const liveQuestionRepository = require('../src/modules/live-question/live-question.repository');

test('les questions ne s’ouvrent que pendant un direct du Studio, une prise de parole ou un temps fort', () => {
  const now = new Date('2026-11-20T10:30:00Z');
  const event = (values) => ({ type: 'studio', startsAt: '2026-11-20T10:00:00Z', endsAt: '2026-11-20T11:00:00Z', ...values });
  assert.equal(liveQuestionService.isLive(event(), now), true);
  assert.equal(liveQuestionService.isLive(event({ startsAt: '2026-11-20T10:45:00Z' }), now), false);
  assert.equal(liveQuestionService.isLive(event({ endsAt: '2026-11-20T10:25:00Z' }), now), true);
  assert.equal(liveQuestionService.isLive(event({ endsAt: '2026-11-20T10:15:00Z' }), now), false);
  assert.equal(liveQuestionService.isLive(event({ endsAt: null, startsAt: '2026-11-20T09:00:00Z' }), now), true);
  assert.equal(liveQuestionService.isLive(event({ type: 'spotlight' }), now), false);
});

test('une question du public arrive à l’animateur seulement pendant le direct', async (context) => {
  const now = new Date('2026-11-20T10:30:00Z');
  let saved;
  context.mock.method(liveQuestionRepository, 'findEvent', async (id) => (id === 'live' ? { id, type: 'talk', startsAt: '2026-11-20T10:00:00Z', endsAt: null } : { id, type: 'talk', startsAt: '2026-11-20T15:00:00Z', endsAt: null }));
  context.mock.method(liveQuestionRepository, 'create', async (values) => { saved = values; return { id: 'q1', ...values }; });

  const created = await liveQuestionService.createPublic('live', { question: 'Quels avantages fiscaux ?', authorName: '' }, now);
  assert.equal(created.id, 'q1');
  assert.equal(saved.status, 'new');
  assert.equal(saved.authorName, null);
  await assert.rejects(liveQuestionService.createPublic('later', { question: 'Trop tôt ?' }, now), (error) => error.code === 'LIVE_NOT_OPEN');
});

test('la galerie d’un stand garde 5 images au plus et retire le fichier refusé', async (context) => {
  const occupant = { id: 'stand-a', gallery: ['/uploads/gallery/a.jpg', '/uploads/gallery/b.jpg', '/uploads/gallery/c.jpg', '/uploads/gallery/d.jpg'] };
  context.mock.method(occupantRepository, 'findById', async () => occupant);
  context.mock.method(occupantRepository, 'update', async (item, values) => Object.assign(item, values));

  await occupantService.addGalleryImage('stand-a', { filename: 'e.jpg' });
  assert.equal(occupant.gallery.length, 5);
  await assert.rejects(occupantService.addGalleryImage('stand-a', { filename: 'f.jpg' }), (error) => error.code === 'GALLERY_FULL');
  assert.equal(occupant.gallery.length, 5);

  await occupantService.removeGalleryImage('stand-a', '/uploads/gallery/a.jpg');
  assert.deepEqual(occupant.gallery, ['/uploads/gallery/b.jpg', '/uploads/gallery/c.jpg', '/uploads/gallery/d.jpg', '/uploads/gallery/e.jpg']);
  await assert.rejects(occupantService.removeGalleryImage('stand-a', '/uploads/gallery/zz.jpg'), (error) => error.code === 'GALLERY_IMAGE_NOT_FOUND');
});

test('une demande Investor Desk saisie dans le back office n’est rattachée à aucun stand, même module fermé', async (context) => {
  const created = [];
  context.mock.method(investorRequestRepository, 'create', async (values) => { created.push(values); return values; });
  const values = { fullName: 'Ama Kodjo', email: 'Ama@Example.com', projectSummary: 'Projet de transformation du soja.', status: 'new', consentApizf: false };

  await investorRequestService.createManual(values);
  assert.equal('occupantId' in created[0], false);
  assert.equal(created[0].email, 'ama@example.com');
  assert.equal(investorRequestValidation.createManual.validate({ ...values, email: 'pas-un-email' }).error?.details[0].path[0], 'email');
  assert.equal(investorRequestValidation.createPublic.validate({ ...values, occupantId: 'ancien-client', consentApizf: true }, { stripUnknown: true }).value.occupantId, undefined);
});

test('les formats du Studio se règlent dans Paramètres ; un format inconnu ou encore utilisé est refusé', async (context) => {
  const { StudioInvitation } = require('../src/models');
  context.mock.method(studioInvitationRepository, 'create', async (values) => values);
  context.mock.method(notificationService, 'studioInvited', () => {});
  const admin = { id: 'u1', role: 'super-admin' };

  await assert.rejects(studioInvitationService.create(admin, { guestName: 'Kossi', email: 'k@b.tg', format: 'podcast' }), (error) => error.code === 'STUDIO_FORMAT_UNKNOWN');
  assert.equal(settingsService.studioFormatLabel('face_to_face', 'en'), 'Face-to-face interview');
  assert.equal(settingsService.studioFormatLabel('face_to_face', 'fr'), 'Face-à-face');

  context.mock.method(StudioInvitation, 'count', async () => 2);
  await assert.rejects(settingsService.update({ studioFormats: [{ key: 'two_minutes', label: '2 min avec…' }] }, admin), (error) => error.code === 'STUDIO_FORMAT_IN_USE');
});

test('un service inconnu est refusé au diagnostic et à l’engagement de suivi', async (context) => {
  const request = { id: 'ir-5', classification: null, status: 'new', diagnosedAt: null };
  investorSetup(context, { request });
  await assert.rejects(investorRequestService.saveDiagnosis('ir-5', { qualification: {}, recommendedService: 'inconnu', nextAction: 'Rappeler' }), (error) => error.code === 'SERVICE_NOT_FOUND');
  await investorRequestService.saveDiagnosis('ir-5', { qualification: {}, recommendedService: 'regimes', nextAction: 'Rappeler' });
  assert.equal(request.recommendedService, 'regimes');
  assert.ok(investorRequestValidation.difficulty.validate({ difficulty: { company: 'Usine', regime: 'free_zone', nature: 'Douane', description: 'Retards' }, commitmentService: 'inconnu' }).error);
});

test('grand écran : le service du jour tourne chaque jour, peut être imposé, et la boucle vidéo passe d’abord, les données en direct en réserve', async (context) => {
  const screenService = require('../src/modules/screen/screen.service');
  const settings = { screenService: '', screenMode: 'live', screenVideoUrl: '' };
  context.mock.method(settingsService, 'current', () => ({ ...settings }));
  context.mock.method(settingsService, 'studioSchedule', () => ({ firstDay: '2026-11-27' }));
  const day = (n) => new Date(Date.UTC(2026, 10, 27 + n, 10));
  assert.equal(screenService.serviceOfDay(day(0)), 'orientation');
  assert.equal(screenService.serviceOfDay(day(1)), 'regimes');
  assert.equal(screenService.serviceOfDay(day(6)), 'orientation');
  settings.screenService = 'aftercare';
  assert.equal(screenService.serviceOfDay(day(3)), 'aftercare');

  // Données en direct, sans base : programme, compteurs, capsules et stands.
  const models = require('../src/models');
  context.mock.method(programEventService, 'getToday', async () => ({ date: '2026-11-27', spotlight: null, today: [], upcoming: [] }));
  for (const name of ['ChallengePassport', 'InvestorMeeting', 'B2bMeeting', 'StudioInvitation']) context.mock.method(models[name], 'count', async () => 0);
  context.mock.method(models.StudioInvitation, 'findAll', async () => []);
  context.mock.method(occupantRepository, 'findPublic', async () => [{ id: 's1', name: 'Zener', standLabel: null, logoUrl: null }]);

  settings.screenMode = 'video';
  settings.screenVideoUrl = 'https://videos.tg/boucle.mp4';
  const video = await screenService.getPublic();
  assert.equal(video.mode, 'video');
  assert.equal(video.videoUrl, 'https://videos.tg/boucle.mp4');
  // Si la vidéo ne peut pas être lue, l'écran repasse en direct avec ces données.
  assert.equal(video.stands[0].name, 'Zener');
  assert.equal(video.service, 'aftercare');

  settings.screenMode = 'live';
  const live = await screenService.getPublic();
  assert.equal(live.mode, 'live');
  assert.equal(live.videoUrl, undefined);
});

test('l’accueil servi aux moteurs contient son texte, l’événement FIL 2026 et les services ; le grand écran n’est pas indexé', async () => {
  const seoService = require('../src/modules/seo/seo.service');
  const home = await seoService.pageMeta('/');
  assert.match(home.body, /Investir au Togo, nous facilitons votre réussite/);
  assert.match(home.body, /Demande de Carnet Bleu/);
  const graph = home.jsonLd['@graph'];
  assert.equal(graph.find((item) => item['@type'] === 'Event').startDate, '2026-11-27');
  assert.equal(graph.find((item) => item.hasOfferCatalog).hasOfferCatalog.itemListElement.length, 6);
  assert.equal((await seoService.pageMeta('/ecran')).robots, 'noindex, nofollow');
  assert.equal((await seoService.pageMeta('/investor-desk')).canonical, '/guichets/rappel');
});

test('la fiche de diagnostic se télécharge en PDF une fois le diagnostic enregistré', async (context) => {
  const request = { id: 'ir-6', fullName: 'Ama Ségbé', email: 'ama@example.tg', guichet: 'project', source: 'desk', classification: 'B', status: 'new', diagnosedAt: null, qualification: { sector: 'Industrie', jobs: 12, agreement: true, origin: 'Bénin 🇧🇯' }, createdAt: new Date() };
  investorSetup(context, { request });
  await assert.rejects(investorRequestService.diagnosisPdf('ir-6'), (error) => error.code === 'DIAGNOSIS_MISSING');
  request.diagnosedAt = new Date();
  const { buffer, fileName } = await investorRequestService.diagnosisPdf('ir-6');
  assert.equal(buffer.subarray(0, 5).toString(), '%PDF-');
  assert.match(fileName, /^fiche-diagnostic-DG-\d{2}-[A-Z0-9-]+\.pdf$/);
});

const auditLogService = require('../src/modules/audit-log/audit-log.service');

test('le journal des actions décrit chaque modification de l’espace équipe sans garder le contenu saisi', () => {
  const id = '3f2a9c1e-7b4d-4e2a-9f10-aa12bb34cc56';
  assert.deepEqual(auditLogService.describe('PATCH', `/api/investor-requests/${id}/follow-ups/${id}`), { section: 'Guichets', action: 'Modification · relance' });
  assert.deepEqual(auditLogService.describe('POST', `/api/studio-invitations/${id}/schedule`), { section: 'Studio', action: 'Créneau fixé' });
  assert.deepEqual(auditLogService.describe('DELETE', `/api/occupants/${id}`), { section: 'Stands', action: 'Suppression' });
  assert.deepEqual(auditLogService.describe('POST', '/api/challenge-passages'), { section: 'Défis', action: 'Passage validé' });
  assert.equal(auditLogService.describe('POST', '/api/push-subscriptions'), null);
  assert.equal(auditLogService.describe('GET', '/api/occupants'), null);
  assert.equal(auditLogService.targetOf({ firstName: 'Afi', lastName: 'Koudjo', passwordHash: 'x' }), 'Afi Koudjo');
  assert.equal(auditLogService.targetOf([{ name: 'liste' }]), null);
});

test('WhatsApp : désactivé, tout reste en e-mail ; activé, la confirmation part aussi par WhatsApp et les rappels par WhatsApp avec l’e-mail en repli', async (context) => {
  const queued = [];
  context.mock.method(notificationRepository, 'cancelPending', async () => {});
  context.mock.method(notificationRepository, 'enqueue', async (jobs) => { queued.push(...jobs); });
  const previous = env.whatsapp.enabled;
  const previousNotifications = env.notifications.enabled;
  env.notifications.enabled = true;
  context.after(() => { env.notifications.enabled = previousNotifications; });
  context.after(() => { env.whatsapp.enabled = previous; });
  const settle = () => new Promise((resolve) => { setTimeout(resolve, 20); });
  const meeting = { id: 'm-1', startsAt: new Date(Date.now() + 3 * 24 * 3600000), guichet: 'project', location: 'Stand API-ZF · guichet « Mon projet d’investissement »' };
  const request = { fullName: 'Kossi Mensah', email: 'k@exemple.tg', phone: '+22890123456', guichet: 'project', language: 'fr' };

  env.whatsapp.enabled = false;
  notificationService.investorMeetingChanged('scheduled', meeting, request);
  await settle();
  assert.deepEqual(queued.map((job) => job.channel), ['email', 'email', 'email']);

  queued.length = 0;
  env.whatsapp.enabled = true;
  notificationService.investorMeetingChanged('scheduled', meeting, request);
  await settle();
  assert.deepEqual(queued.map((job) => job.channel), ['email', 'whatsapp', 'whatsapp', 'whatsapp']);
  assert.equal(queued[1].payload.template, 'hub26_rdv_confirme');
  assert.equal(queued[1].payload.params[1], 'rendez-vous avec l’API-ZF');
  assert.equal(queued[1].payload.params[3], 'Stand API-ZF · guichet « Mon projet d’investissement »');
  assert.equal(queued[2].payload.template, 'hub26_rdv_rappel');
  assert.equal(queued[2].payload.fallback.recipient, 'k@exemple.tg');

  // Sans téléphone, la personne garde les e-mails.
  queued.length = 0;
  notificationService.investorMeetingChanged('scheduled', meeting, { ...request, phone: null });
  await settle();
  assert.deepEqual(queued.map((job) => job.channel), ['email', 'email', 'email']);
});

const whatsappService = require('../src/modules/whatsapp/whatsapp.service');

test('WhatsApp entrant : vérification Meta, signature, une réponse automatique par personne et par jour', async (context) => {
  const previous = { ...env.whatsapp };
  context.after(() => { Object.assign(env.whatsapp, previous); whatsappService._reset(); });
  Object.assign(env.whatsapp, { token: 'jeton-test', verifyToken: 'secret-test', appSecret: 'cle-app' });
  whatsappService._reset();

  assert.equal(whatsappService.verify({ mode: 'subscribe', token: 'secret-test', challenge: '12345' }), '12345');
  assert.equal(whatsappService.verify({ mode: 'subscribe', token: 'mauvais', challenge: '12345' }), null);

  const raw = Buffer.from('{"entry":[]}');
  const signature = `sha256=${crypto.createHmac('sha256', 'cle-app').update(raw).digest('hex')}`;
  assert.equal(whatsappService.validSignature(raw, signature), true);
  assert.equal(whatsappService.validSignature(raw, 'sha256=faux'), false);

  const sent = [];
  context.mock.method(global, 'fetch', async (url, options) => { sent.push([url, JSON.parse(options.body)]); return { ok: true, json: async () => ({}) }; });
  const message = { entry: [{ changes: [{ value: { metadata: { phone_number_id: '1454431384412339' }, messages: [{ from: '22890123456', type: 'text' }] } }] }] };
  await whatsappService.handleIncoming(message);
  await whatsappService.handleIncoming(message);
  await whatsappService.handleIncoming({ entry: [{ changes: [{ value: { metadata: { phone_number_id: '1454431384412339' }, statuses: [{ status: 'read' }] } }] }] });
  assert.equal(sent.length, 1);
  assert.match(sent[0][0], /\/1454431384412339\/messages$/);
  assert.equal(sent[0][1].to, '22890123456');
  assert.match(sent[0][1].text.body, /hub\.investir\.tg/);
});

test('un occupant ne voit et ne modifie que son propre stand, sans toucher au nom, à l’emplacement ni au statut', async (context) => {
  const originalSecret = env.auth.secret;
  env.auth.secret = 'hubinvest-own-stand-test-secret';
  context.after(() => { env.auth.secret = originalSecret; });
  const ownId = crypto.randomUUID();
  const otherId = crypto.randomUUID();
  context.mock.method(User, 'findOne', async ({ where }) => ({
    occupantId: ownId,
    occupant: { status: 'active' },
    toJSON: () => ({ id: where.id, occupantId: ownId, role: 'occupant', firstName: 'Afi', lastName: 'Mensah' }),
  }));
  const stand = { id: ownId, name: 'Stand Afi', slug: 'stand-afi', status: 'active', standLabel: 'B12' };
  context.mock.method(occupantRepository, 'findById', async (id) => (id === ownId ? stand : { ...stand, id }));
  context.mock.method(auditLogService, 'recordRequest', () => null);
  let updatedWith;
  context.mock.method(occupantRepository, 'update', async (occupant, values) => {
    updatedWith = values;
    return { ...occupant, ...values };
  });

  const server = app.listen(0, '127.0.0.1');
  context.after(() => server.close());
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/occupants`;
  const headers = { Authorization: `Bearer ${jwt.sign({}, env.auth.secret, { subject: crypto.randomUUID() })}`, 'Content-Type': 'application/json' };

  assert.equal((await fetch(base, { headers })).status, 403);
  assert.equal((await fetch(`${base}/${otherId}`, { headers })).status, 403);
  assert.equal((await fetch(`${base}/${ownId}`, { headers })).status, 200);
  assert.equal((await fetch(`${base}/${otherId}`, { method: 'PATCH', headers, body: JSON.stringify({ activity: 'Autre' }) })).status, 403);
  assert.equal((await fetch(`${base}/${ownId}`, { method: 'DELETE', headers })).status, 403);

  const response = await fetch(`${base}/${ownId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ activity: 'Transformation du soja', name: 'Autre nom', standLabel: 'A1', status: 'inactive' }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(updatedWith, { activity: 'Transformation du soja' });
});

test('guichets et roue : l’équipe API-ZF et les occupants du Stand API-ZF, pas les autres stands', async (context) => {
  const originalSecret = env.auth.secret;
  env.auth.secret = 'hubinvest-apizf-team-test-secret';
  context.after(() => { env.auth.secret = originalSecret; });
  const spaces = { zf: 'apizf', ind: 'industry' };
  context.mock.method(User, 'findOne', async ({ where }) => ({
    occupantId: `stand-${where.id}`,
    occupant: { status: 'active', space: spaces[where.id] },
    toJSON: () => ({ id: where.id, occupantId: `stand-${where.id}`, role: 'occupant', occupant: { status: 'active', space: spaces[where.id] } }),
  }));
  const wheelService = require('../src/modules/wheel/wheel.service');
  context.mock.method(wheelService, 'overview', async () => ({ segments: [], codes: [], plays: [], stats: {} }));
  context.mock.method(investorRequestRepository, 'findAll', async () => ({ rows: [], count: 0 }));

  const server = app.listen(0, '127.0.0.1');
  context.after(() => server.close());
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const requestAs = (subject, path) => fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${jwt.sign({}, env.auth.secret, { subject })}` } });

  assert.equal((await requestAs('ind', '/wheel')).status, 403);
  assert.equal((await requestAs('ind', '/investor-requests')).status, 403);
  assert.equal((await requestAs('zf', '/wheel')).status, 200);
  assert.equal((await requestAs('zf', '/investor-requests')).status, 200);
});

test('la session se renouvelle tant que l’application est ouverte ; un jeton expiré est refusé', async (context) => {
  const originalSecret = env.auth.secret;
  env.auth.secret = 'hubinvest-refresh-test-secret';
  context.after(() => { env.auth.secret = originalSecret; });
  context.mock.method(User, 'findOne', async ({ where }) => ({
    occupantId: null,
    toJSON: () => ({ id: where.id, occupantId: null, role: 'admin' }),
  }));
  const server = app.listen(0, '127.0.0.1');
  context.after(() => server.close());
  await new Promise((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/auth/refresh`;
  const post = (token) => fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });

  const response = await post(jwt.sign({ role: 'admin' }, env.auth.secret, { subject: 'u-refresh', expiresIn: '1h' }));
  assert.equal(response.status, 200);
  const { data } = await response.json();
  const renewed = jwt.verify(data.token, env.auth.secret);
  assert.equal(renewed.sub, 'u-refresh');
  assert.ok(renewed.exp * 1000 > Date.now() + 2 * 3600000);
  assert.equal((await post(jwt.sign({}, env.auth.secret, { subject: 'u-refresh', expiresIn: -10 }))).status, 401);
});

// Audit des droits : chaque rôle appelle les écrans de lecture du back office ; « oui » = permis (ni 401, ni 403, ni erreur
// serveur), « non » = refusé en 403, « - » = non vérifié. Les comptes sont simulés, les données viennent de la base de test.
test('audit des droits : chaque rôle n’ouvre que ses écrans, sans erreur serveur', async (context) => {
  const originalSecret = env.auth.secret;
  env.auth.secret = 'hubinvest-audit-test-secret';
  context.after(() => { env.auth.secret = originalSecret; });
  const industryStand = crypto.randomUUID();
  const apizfStand = crypto.randomUUID();
  const accounts = {
    super: { role: 'super-admin', occupantId: null, occupant: null },
    admin: { role: 'admin', occupantId: null, occupant: null },
    ind: { role: 'occupant', occupantId: industryStand, occupant: { status: 'active', space: 'industry' } },
    zf: { role: 'occupant', occupantId: apizfStand, occupant: { status: 'active', space: 'apizf' } },
    anim: { role: 'animateur', occupantId: null, occupant: null },
  };
  context.mock.method(User, 'findOne', async ({ where }) => {
    const account = accounts[where.id];
    return { ...account, toJSON: () => ({ id: where.id, firstName: 'Audit', lastName: where.id, email: `${where.id}@example.test`, ...account }) };
  });
  context.mock.method(occupantRepository, 'findById', async (id) => ({ id, name: 'Stand', slug: 'stand', status: 'active', space: id === apizfStand ? 'apizf' : 'industry' }));

  const Y = 'oui';
  const N = 'non';
  const S = '-';
  //                                              super admin occInd occZf anim
  const checks = [
    ['GET', '/users/me', [Y, Y, Y, Y, Y]],
    ['POST', '/auth/refresh', [Y, Y, Y, Y, Y]],
    ['GET', '/dashboard', [Y, Y, Y, Y, Y]],
    ['GET', '/b2b-needs', [Y, Y, Y, Y, N]],
    ['GET', '/b2b-proposals', [Y, Y, Y, Y, N]],
    ['GET', '/challenge-passports', [Y, Y, Y, Y, N]],
    ['GET', '/challenge-passports/rewards', [Y, Y, N, Y, Y]],
    ['GET', '/challenge-passports/search?q=ab', [Y, Y, Y, Y, Y]],
    ['GET', '/challenge-passports/code/ABCDEF', [Y, Y, N, Y, Y]],
    ['GET', '/challenge-passages/stats', [N, N, Y, Y, N]],
    ['GET', '/wheel', [Y, Y, N, Y, N]],
    ['GET', '/wheel/prizes/ZZZZ', [Y, Y, N, Y, Y]],
    ['GET', '/investor-requests', [Y, Y, N, Y, N]],
    ['GET', `/investor-requests/${crypto.randomUUID()}`, [Y, Y, N, Y, N]],
    ['GET', '/occupants', [Y, Y, N, N, N]],
    ['GET', `/occupants/${industryStand}`, [Y, Y, Y, N, N]],
    ['GET', `/occupants/${apizfStand}`, [Y, Y, N, Y, N]],
    ['GET', '/contacts', [S, S, Y, Y, N]],
    ['GET', '/contacts/admin/stats', [Y, Y, N, N, N]],
    ['GET', `/contacts/admin/stands/${industryStand}`, [Y, Y, N, N, N]],
    ['GET', '/program-events', [Y, Y, N, N, N]],
    ['GET', '/studio-invitations', [Y, Y, N, N, N]],
    ['GET', '/live-questions', [Y, Y, N, N, Y]],
    ['GET', '/users', [Y, N, N, N, N]],
    ['GET', '/audit-logs', [Y, N, N, N, N]],
    // Actions, sur des identifiants inexistants (rien n'est écrit) : permis = 404 ou 422, refusé = 403.
    ['PATCH', `/challenge-passports/${crypto.randomUUID()}/redeem`, [Y, Y, N, Y, Y]],
    ['POST', `/wheel/plays/${crypto.randomUUID()}/claim`, [Y, Y, N, Y, N]],
    ['POST', '/wheel/prizes/ZZZZ/claim', [Y, Y, N, Y, Y]],
    ['POST', `/investor-requests/${crypto.randomUUID()}/follow-ups`, [Y, Y, N, Y, N]],
    ['PATCH', `/occupants/${industryStand}`, [Y, Y, Y, N, N]],
    ['PATCH', `/live-questions/${crypto.randomUUID()}`, [Y, Y, N, N, Y]],
    // Page Relances : Contacts pour les stands et l'API-ZF, Guichets pour l'équipe API-ZF (dont le Stand API-ZF).
    ['GET', '/follow-ups/contacts', [Y, Y, Y, Y, N]],
    ['GET', '/follow-ups/guichets', [Y, Y, N, Y, N]],
    ['POST', `/follow-ups/contacts/${crypto.randomUUID()}`, [Y, Y, Y, Y, N]],
    ['PATCH', `/follow-ups/contacts/${crypto.randomUUID()}`, [Y, Y, Y, Y, N]],
    ['DELETE', `/follow-ups/contacts/${crypto.randomUUID()}`, [Y, Y, Y, Y, N]],
    ['GET', '/follow-ups/b2b', [Y, Y, Y, Y, N]],
    ['POST', `/follow-ups/b2b/${crypto.randomUUID()}`, [Y, Y, Y, Y, N]],
    ['PATCH', `/follow-ups/b2b/${crypto.randomUUID()}`, [Y, Y, Y, Y, N]],
  ];

  const server = app.listen(0, '127.0.0.1');
  context.after(() => server.close());
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const problems = [];
  for (const [index, subject] of Object.keys(accounts).entries()) {
    const token = jwt.sign({}, env.auth.secret, { subject, expiresIn: '1h' });
    for (const [method, url, expected] of checks) {
      const want = expected[index];
      if (want === S) continue;
      const response = await fetch(`${base}${url}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        ...(method === 'GET' ? {} : { body: '{}' }),
      });
      const allowed = ![401, 403].includes(response.status) && response.status < 500;
      const fine = want === Y ? allowed : response.status === 403;
      if (!fine) {
        const body = await response.json().catch(() => ({}));
        problems.push(`${subject} ${method} ${url} → ${response.status} ${body.code || ''} (attendu : ${want === Y ? 'permis' : '403'})`);
      }
    }
  }
  assert.deepEqual(problems, []);
});

test('« Prendre contact » demande le téléphone et l’e-mail du visiteur, et les garde sur le contact', async (context) => {
  const contactValidation = require('../src/modules/contact/contact.validation');
  const base = { id: crypto.randomUUID(), fullName: 'Afi Mensah', phone: '+22890000000', consentOccupant: true };
  assert.ok(contactValidation.createPublic.validate(base).error, 'l’e-mail est obligatoire');
  const { value, error } = contactValidation.createPublic.validate({ ...base, email: ' Afi@Example.com ' });
  assert.equal(error, undefined);
  assert.equal(value.email, 'afi@example.com');

  let saved;
  context.mock.method(occupantRepository, 'findBySlug', async () => ({ id: 'stand-a', status: 'active' }));
  context.mock.method(contactRepository.sequelize, 'transaction', async (callback) => callback({}));
  context.mock.method(contactRepository, 'findExisting', async () => null);
  context.mock.method(contactRepository, 'create', async (values) => { saved = values; return values; });
  context.mock.method(notificationService, 'contactRequested', () => {});
  await contactService.createPublic('stand-a', value);
  assert.equal(saved.email, 'afi@example.com');
  assert.equal(saved.phone, '+22890000000');
});

test('« Prendre contact » en deux temps : la réponse « quand » donne la classe, et « opportunités » vaut accord API-ZF', async (context) => {
  context.mock.method(followUpService, 'applyClassFollowUp', async () => null);
  const contactValidation = require('../src/modules/contact/contact.validation');
  const base = { id: crypto.randomUUID(), fullName: 'Kodjo Ama', phone: '+22891000000', email: 'kodjo@example.com', consentOccupant: true };
  const saved = [];
  context.mock.method(occupantRepository, 'findBySlug', async () => ({ id: 'stand-a', status: 'active' }));
  context.mock.method(contactRepository.sequelize, 'transaction', async (callback) => callback({}));
  context.mock.method(contactRepository, 'findExisting', async () => null);
  context.mock.method(contactRepository, 'create', async (values) => { saved.push(values); return values; });
  context.mock.method(notificationService, 'contactRequested', () => {});

  for (const extra of [{}, { qualification: 'a', company: 'Agro Togo' }, { qualification: 'C' }]) {
    const { value, error } = contactValidation.createPublic.validate({ ...base, ...extra });
    assert.equal(error, undefined);
    await contactService.createPublic('stand-a', value);
  }
  assert.deepEqual(saved.map((item) => [item.qualification, item.company, item.consentApizf]), [[null, null, false], ['A', 'Agro Togo', false], ['C', null, true]]);
});

test('relances des contacts : A crée une relance à 48 h, B à 7 jours, C aucune ; une nouvelle classe remplace l’ancienne', async (context) => {
  enableNotifications(context);
  const created = [];
  const destroyed = [];
  let pending = [];
  context.mock.method(followUpRepository, 'findPendingContactFollowUps', async () => pending);
  context.mock.method(followUpRepository, 'destroyContactFollowUp', async (item) => { destroyed.push(item.id); });
  context.mock.method(followUpRepository, 'createContactFollowUp', async (values) => { const item = { id: `f${created.length + 1}`, ...values }; created.push(item); return item; });
  context.mock.method(notificationService, 'contactFollowUpChanged', () => {});
  context.mock.method(notificationService, 'contactFollowUpRemoved', () => {});
  const contact = { id: 'contact-a', occupantId: 'stand-a', fullName: 'Ama' };

  const now = Date.now();
  await followUpService.applyClassFollowUp({ ...contact, qualification: 'A' });
  assert.equal(created.length, 1);
  assert.equal(created[0].autoSource, 'A');
  assert.ok(Math.abs(new Date(created[0].dueAt).getTime() - (now + 48 * 3600000)) < 60000);

  pending = [created[0]];
  await followUpService.applyClassFollowUp({ ...contact, qualification: 'B' });
  assert.deepEqual(destroyed, ['f1']);
  assert.equal(created[1].autoSource, 'B');
  assert.ok(Math.abs(new Date(created[1].dueAt).getTime() - (now + 7 * 24 * 3600000)) < 60000);

  pending = [created[1]];
  assert.equal(await followUpService.applyClassFollowUp({ ...contact, qualification: 'C' }), null);
  assert.deepEqual(destroyed, ['f1', 'f2']);
  assert.equal(created.length, 2);
});

test('compte rendu B2B : une prochaine étape datée crée une relance B2B, sans date aucune', async (context) => {
  const proposal = { id: 'prop-9', need: { occupantId: 'stand-a' } };
  const meeting = { id: 'm9', startsAt: new Date(Date.now() - 3600000), nextStep: null };
  context.mock.method(b2bProposalService, 'getManaged', async () => proposal);
  context.mock.method(b2bMeetingRepository, 'findById', async () => meeting);
  context.mock.method(b2bMeetingRepository, 'update', async (item, values) => Object.assign(item, values));
  const added = [];
  context.mock.method(followUpService, 'addB2b', async (user, proposalId, values) => { added.push({ proposalId, ...values }); });

  const dueAt = new Date(Date.now() + 2 * 24 * 3600000).toISOString();
  await b2bMeetingService.report({ id: 'u1' }, 'prop-9', 'm9', { outcome: 'present', nextStep: 'Envoyer le devis' });
  assert.equal(added.length, 0);
  await b2bMeetingService.report({ id: 'u1' }, 'prop-9', 'm9', { outcome: 'present', nextStep: 'Envoyer le devis', nextStepAt: dueAt });
  assert.deepEqual(added, [{ proposalId: 'prop-9', dueAt, reason: 'Envoyer le devis' }]);
});

test('roue : toutes les cases perdantes et 4 lots tirés au hasard ; le tirage se fait sur la roue affichée', async (context) => {
  const lose = Array.from({ length: 5 }, (_, index) => ({ id: crypto.randomUUID(), kind: 'lose', label: `Perdu ${index + 1}`, quantity: null, awarded: 0, isActive: true }));
  const prizes = Array.from({ length: 12 }, (_, index) => ({ id: crypto.randomUUID(), kind: 'prize', label: `Lot ${index + 1}`, quantity: 5, awarded: 0, isActive: true }));
  const segments = [...lose, ...prizes];
  context.mock.method(wheelRepository, 'findActiveSegments', async () => segments);

  // Roue publique : 9 cases, toutes les perdantes, 4 lots distincts.
  const shown = (await wheelService.listPublic('fr')).segments;
  assert.equal(shown.length, 9);
  assert.equal(shown.filter((segment) => segment.kind === 'lose').length, 5);
  assert.equal(new Set(shown.filter((segment) => segment.kind === 'prize').map((segment) => segment.id)).size, 4);

  // Le tirage reprend exactement la roue affichée (même ordre) et tombe sur l'une de ses cases.
  const code = { id: 'code-9', code: 'W9N4', spinsAllowed: 1 };
  wheelSetup(context, { segments, code });
  const outcome = await wheelService.spin({ code: 'W9N4', player: PLAYER, wheel: shown.map((segment) => segment.id) }, 'fr', () => 0);
  assert.deepEqual(outcome.segments.map((segment) => segment.id), shown.map((segment) => segment.id));
  assert.equal(outcome.result.id, shown[0].id);

  // Une roue envoyée invalide (lot inconnu, perdantes manquantes) est remplacée par une nouvelle roue valable.
  const code2 = { id: 'code-10', code: 'X3M7', spinsAllowed: 1 };
  wheelSetup(context, { segments, code: code2 });
  const fallback = await wheelService.spin({ code: 'X3M7', player: PLAYER, wheel: [prizes[0].id, crypto.randomUUID()] }, 'fr', () => 0);
  assert.equal(fallback.segments.length, 9);
  assert.equal(fallback.segments.filter((segment) => segment.kind === 'lose').length, 5);
});

test('roue : le code est vérifié avant d’afficher la roue, sans rien jouer ni enregistrer', async (context) => {
  const code = { id: 'code-c', code: 'Q8R2', spinsAllowed: 1 };
  const plays = wheelSetup(context, { segments: [], code });
  const ok = await wheelService.checkCode({ code: ' q8-r2 ', player: PLAYER });
  assert.deepEqual(ok, { code: 'Q8R2', spinsLeft: 1 });
  assert.equal(plays.length, 0);

  await assert.rejects(wheelService.checkCode({ code: 'ZZZZ', player: PLAYER }), (error) => error.code === 'WHEEL_CODE_INVALID' && error.message === 'Code invalide.');
  plays.push({ id: 'p', wheelCodeId: 'code-c', passportId: 'passport-b' });
  await assert.rejects(wheelService.checkCode({ code: 'Q8R2', player: PLAYER }), (error) => error.code === 'WHEEL_CODE_USED');
});
