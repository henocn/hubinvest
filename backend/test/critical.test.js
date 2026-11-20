const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { UniqueConstraintError } = require('sequelize');
const contactService = require('../src/modules/contact/contact.service');
const contactRepository = require('../src/modules/contact/contact.repository');
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

test('un administrateur doit être rattaché à un stand', async (context) => {
  context.mock.method(userRepository, 'findOccupantById', async (id) => (id === 'occupant-a' ? { id } : null));
  context.mock.method(userRepository, 'create', async (values) => ({ toJSON: () => values }));

  await assert.rejects(
    userService.create({ role: 'super-admin' }, {
      firstName: 'Koffi', lastName: 'Mensah', email: 'admin@example.com', password: 'secret-test', role: 'admin',
    }),
    (error) => error.status === 422 && error.code === 'OCCUPANT_REQUIRED',
  );

  const created = await userService.create({ role: 'super-admin' }, {
    firstName: 'Koffi', lastName: 'Mensah', email: 'admin@example.com', password: 'secret-test', role: 'admin', occupantId: 'occupant-a',
  });
  assert.equal(created.occupantId, 'occupant-a');
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

  assert.equal(result.status, 403);
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

test('une demande publique est rattachée au stand lu par le serveur, sans qualification ni compte visiteur', async (context) => {
  let saved;
  context.mock.method(occupantRepository, 'findBySlug', async () => ({ id: 'stand-a' }));
  context.mock.method(contactRepository.sequelize, 'transaction', async (callback) => callback({}));
  context.mock.method(contactRepository, 'findExisting', async () => null);
  context.mock.method(contactRepository, 'create', async (values) => { saved = values; return values; });

  const result = await contactService.createPublic('stand-a', {
    id: 'request-a', fullName: 'Visiteur Test', phone: '90000000', need: 'Un renseignement',
    consentOccupant: true, occupantId: 'stand-b', qualification: 'hot', consentApizf: true,
  });
  assert.equal(result.created, true);
  assert.equal(saved.occupantId, 'stand-a');
  assert.equal(saved.createdByUserId, null);
  assert.equal(saved.qualification, null);
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

test('le suivi Investor Desk enregistre seulement le statut et la prochaine action', async (context) => {
  const investorRequest = { id: 'request-a' };
  let saved;
  context.mock.method(investorRequestRepository, 'findById', async () => investorRequest);
  context.mock.method(investorRequestRepository, 'update', async (_request, values) => { saved = values; return values; });

  await investorRequestService.update(investorRequest.id, { status: 'in_progress', nextAction: 'Rappeler le porteur du projet' });
  assert.deepEqual(saved, { status: 'in_progress', nextAction: 'Rappeler le porteur du projet' });
});

test('la liste publique B2B ne contient que les besoins ouverts de stands actifs', async (context) => {
  context.mock.method(B2bNeed, 'findAll', async (options) => options);

  const result = await b2bNeedRepository.findPublic();

  assert.deepEqual(result.where, { status: 'open' });
  assert.deepEqual(result.include[0].where, { status: 'active' });
  assert.equal(result.include[0].required, true);
});

test('un administrateur publie un besoin B2B uniquement pour son stand', async (context) => {
  let saved;
  context.mock.method(b2bNeedRepository, 'findOccupantById', async (id) => ({ id }));
  context.mock.method(b2bNeedRepository, 'create', async (values) => { saved = values; return values; });

  await b2bNeedService.create(
    { id: 'admin-a', role: 'admin', occupantId: 'occupant-a' },
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

test('la liste des demandes B2B se limite au stand d’un administrateur de stand', async (context) => {
  const scopes = [];
  context.mock.method(b2bProposalRepository, 'findAllVisible', async (occupantId = null) => { scopes.push(occupantId); return []; });

  await b2bProposalService.listAll({ role: 'admin', occupantId: 'occupant-b' });
  await b2bProposalService.listAll({ role: 'super-admin' });
  assert.deepEqual(scopes, ['occupant-b', null]);
  await assert.rejects(b2bProposalService.listAll({ role: 'admin', occupantId: null }), (error) => error.code === 'STAND_REQUIRED');
});

test('corriger une demande B2B ne prévient pas la personne ; la supprimer reste limité au stand', async (context) => {
  const proposal = { id: 'proposal-a', status: 'pending', need: { occupantId: 'occupant-b', title: 'Besoin' } };
  let saved = null;
  let destroyed = false;
  context.mock.method(b2bProposalRepository, 'findById', async () => proposal);
  context.mock.method(b2bProposalRepository, 'update', async (item, values) => { saved = values; return { ...item, ...values }; });
  context.mock.method(b2bProposalRepository, 'destroy', async () => { destroyed = true; });
  const decided = context.mock.method(notificationService, 'b2bProposalDecided', () => {});

  await b2bProposalService.update({ id: 'user-b', role: 'admin', occupantId: 'occupant-b' }, 'proposal-a', { email: 'Awa@Exemple.tg', phone: '' });
  assert.deepEqual(saved, { email: 'awa@exemple.tg', phone: null });
  assert.equal(decided.mock.callCount(), 0);

  await assert.rejects(
    b2bProposalService.remove({ role: 'admin', occupantId: 'occupant-a' }, 'proposal-a'),
    (error) => error.code === 'B2B_PROPOSAL_NOT_FOUND',
  );
  assert.equal(destroyed, false);
  await b2bProposalService.remove({ role: 'admin', occupantId: 'occupant-b' }, 'proposal-a');
  assert.equal(destroyed, true);
});

test('le backoffice B2B peut lire les propositions d’un besoin existant', async (context) => {
  context.mock.method(b2bNeedRepository, 'findById', async () => ({ id: 'need-b', occupantId: 'occupant-b' }));
  context.mock.method(b2bProposalRepository, 'findAllByNeed', async (needId) => [{ id: 'proposal-a', b2bNeedId: needId }]);

  const result = await b2bProposalService.list({ role: 'admin', occupantId: 'occupant-b' }, 'need-b');
  assert.deepEqual(result, [{ id: 'proposal-a', b2bNeedId: 'need-b' }]);
});

test('une invitation Studio utilise un lien personnel imprévisible', async (context) => {
  let saved;
  context.mock.method(studioInvitationRepository, 'create', async (values) => {
    saved = values;
    return values;
  });
  context.mock.method(studioInvitationRepository, 'findOccupantById', async (id) => ({ id }));

  await studioInvitationService.create(
    { id: 'campaign-user', role: 'admin', occupantId: 'occupant-a' },
    { guestName: 'Invité Test', subject: 'Entretien Studio', scheduledAt: new Date().toISOString() },
  );

  assert.match(saved.token, /^[a-f0-9]{64}$/);
  assert.equal(saved.createdByUserId, 'campaign-user');
  assert.equal(saved.occupantId, 'occupant-a');
  assert.equal(saved.status, 'pending');
});

test('la réponse publique Studio ne révèle pas le lien interne et enregistre sa date', async (context) => {
  const invitation = {
    id: 'invitation-a',
    token: 'a'.repeat(64),
    guestName: 'Invité Test',
    subject: 'Entretien Studio',
    scheduledAt: new Date().toISOString(),
    status: 'pending',
    respondedAt: null,
  };
  context.mock.method(studioInvitationRepository, 'findByToken', async () => invitation);
  context.mock.method(studioInvitationRepository, 'update', async (_invitation, values) => ({ ...invitation, ...values }));

  const result = await studioInvitationService.respond(invitation.token, 'confirmed');

  assert.equal(result.status, 'confirmed');
  assert.ok(result.respondedAt instanceof Date);
  assert.equal(result.token, undefined);
  assert.equal(result.id, undefined);
});

test('le planning Studio d’un administrateur est filtré sur son stand', async (context) => {
  const originalSecret = env.auth.secret;
  env.auth.secret = 'hubinvest-studio-test-secret';
  context.after(() => { env.auth.secret = originalSecret; });
  context.mock.method(User, 'findOne', async ({ where }) => ({
    occupantId: `occupant-${where.id}`,
    occupant: { status: 'active' },
    toJSON: () => ({
      id: where.id,
      occupantId: `occupant-${where.id}`,
      role: 'admin',
    }),
  }));
  const requestedStands = [];
  context.mock.method(studioInvitationRepository, 'findAll', async (occupantId) => {
    requestedStands.push(occupantId);
    return [];
  });

  const server = app.listen(0, '127.0.0.1');
  context.after(() => server.close());
  await new Promise((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/studio-invitations`;
  const requestAs = (subject) => fetch(url, {
    headers: { Authorization: `Bearer ${jwt.sign({}, env.auth.secret, { subject })}` },
  });

  assert.equal((await requestAs('pia')).status, 200);
  assert.deepEqual(requestedStands, ['occupant-pia']);
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

test('la liste des joueurs d’un administrateur est limitée aux scans de son stand', async (context) => {
  let requestedStand;
  context.mock.method(challengePassportRepository, 'findAll', async (occupantId) => {
    requestedStand = occupantId;
    return [];
  });

  await challengePassportService.list({ role: 'admin', occupantId: 'occupant-a' });
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
    challengePassageService.validate({ id: 'user-a', occupantId: 'occupant-a' }, { code: passport.code, classification: 'A' }),
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

test('le passage requis termine le parcours avant la remise', async (context) => {
  const passport = { id: 'passport-a', code: 'ABCD2345', displayName: 'Visiteur Test', status: 'active' };
  let saved;
  let passageValues;
  context.mock.method(challengePassageRepository.sequelize, 'transaction', async (callback) => callback({ LOCK: { UPDATE: 'UPDATE' } }));
  context.mock.method(challengePassportRepository, 'findByCodeForUpdate', async () => passport);
  context.mock.method(challengePassageRepository, 'findExisting', async () => null);
  context.mock.method(challengePassageRepository, 'create', async (values) => {
    passageValues = values;
    return values;
  });
  context.mock.method(challengePassageRepository, 'countByPassport', async () => 3);
  context.mock.method(challengePassportRepository, 'update', async (_passport, values) => {
    saved = values;
    return { ...passport, ...values };
  });

  const result = await challengePassageService.validate(
    { id: 'user-c', occupantId: 'occupant-c' },
    { code: passport.code, classification: 'B' },
  );

  assert.equal(result.status, 'completed');
  assert.equal(result.classification, 'B');
  assert.equal(passageValues.classification, 'B');
  assert.equal(saved.status, 'completed');
  assert.ok(saved.completedAt instanceof Date);
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
  notificationService.contactReminderChanged({
    id: 'contact-a', occupantId: 'occupant-a', createdByUserId: 'occupant-user', fullName: 'Ama', nextAction: 'Envoyer le devis', nextActionAt: dueAt,
  });
  await flushNotifications();
  notificationService.contactReminderChanged({
    id: 'contact-a', occupantId: 'occupant-a', createdByUserId: 'occupant-user', fullName: 'Ama', nextAction: null, nextActionAt: new Date(Date.now() - 1000),
  });
  await flushNotifications();

  assert.deepEqual(cancelled, ['contact-reminder:contact-a', 'contact-reminder:contact-a']);
  assert.equal(queued.length, 1);
  assert.equal(queued[0].dedupeKey, 'contact-reminder:contact-a');
  assert.equal(queued[0].availableAt.getTime(), dueAt.getTime());
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
  assert.deepEqual(realtimeService.channelsFor({ id: 'u1', role: 'super-admin', occupantId: null }), ['user:u1', 'super-admin']);
  assert.deepEqual(realtimeService.channelsFor({ id: 'u2', role: 'admin', occupantId: 'stand-a' }), ['user:u2', 'admins', 'admin:stand-a']);
  assert.deepEqual(realtimeService.channelsFor({ id: 'u3', role: 'occupant', occupantId: 'stand-a' }), ['user:u3', 'occupant:stand-a']);
  assert.deepEqual(realtimeService.channelsFor({ id: 'u4', role: 'animateur', occupantId: null }), ['user:u4', 'animateur']);
  assert.deepEqual(realtimeService.channelsFor({ id: 'u5', role: 'admin', occupantId: null }), ['user:u5', 'admins']);
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
    ['admin:stand-a', 'animateur', 'occupant:stand-a', 'passport:passport-a', 'super-admin'],
  );

  published.length = 0;
  realtimeService.events.investorRequestsChanged();
  assert.deepEqual(published[0], { channels: ['super-admin'], topic: 'investor-requests' });
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
const wheelSetup = (context, { segments, code, playsToday = 0 }) => {
  context.mock.method(wheelRepository, 'countPlayerPlaysSince', async () => playsToday);
  context.mock.method(wheelRepository.sequelize, 'transaction', async (callback) => callback({ LOCK: { UPDATE: 'UPDATE' } }));
  context.mock.method(wheelRepository, 'findPlayerByToken', async (token) => (token === PLAYER ? { id: 'passport-a' } : null));
  context.mock.method(wheelRepository, 'findCodeForUpdate', async (value) => (code && code.code === value ? code : null));
  context.mock.method(wheelRepository, 'findActiveSegmentsForUpdate', async () => segments.filter((segment) => segment.isActive));
  context.mock.method(wheelRepository, 'recordAward', async (segment) => { segment.awarded += 1; });
  context.mock.method(wheelRepository, 'updateCode', async (wheelCode, values) => Object.assign(wheelCode, values));
};

test('un code de la roue ne sert qu’une fois et décompte le lot gagné', async (context) => {
  const prize = { id: 'p1', kind: 'prize', label: 'T-shirt', sponsor: 'WAFO INDUSTRIE', quantity: 2, awarded: 0, isActive: true };
  const lose = { id: 'l1', kind: 'lose', label: 'Presque !', sponsor: null, quantity: null, awarded: 0, isActive: true };
  const code = { code: 'K7P2QX', usedAt: null, expiresAt: new Date(Date.now() + 60000) };
  wheelSetup(context, { segments: [prize, lose], code });

  const outcome = await wheelService.spin({ code: ' k7p2-qx ', player: PLAYER }, 'fr', (length) => { assert.equal(length, 2); return 0; });
  assert.equal(outcome.result.id, 'p1');
  assert.equal(outcome.result.sponsor, 'WAFO INDUSTRIE');
  assert.equal(prize.awarded, 1);
  assert.equal(code.resultLabel, 'T-shirt');
  assert.equal(code.passportId, 'passport-a');
  assert.ok(code.usedAt);

  await assert.rejects(wheelService.spin({ code: 'K7P2QX', player: PLAYER }, 'fr', () => 0), (error) => error.status === 409 && error.code === 'WHEEL_CODE_USED');
  assert.equal(prize.awarded, 1);
});

test('un code expiré ou inventé ne fait pas tourner la roue', async (context) => {
  const lose = { id: 'l1', kind: 'lose', label: 'Dommage !', quantity: null, awarded: 0, isActive: true };
  const code = { code: 'ABCDEF', usedAt: null, expiresAt: new Date(Date.now() - 1000) };
  wheelSetup(context, { segments: [lose], code });

  await assert.rejects(wheelService.spin({ code: 'ABCDEF', player: PLAYER }, 'fr'), (error) => error.status === 410 && error.code === 'WHEEL_CODE_EXPIRED');
  await assert.rejects(wheelService.spin({ code: 'ZZZZZZ', player: PLAYER }, 'fr'), (error) => error.status === 404 && error.code === 'WHEEL_CODE_INVALID');
  await assert.rejects(wheelService.spin({ code: 'ABCDEF', player: 'b'.repeat(64) }, 'fr'), (error) => error.status === 422 && error.code === 'WHEEL_PLAYER_REQUIRED');
  assert.equal(code.usedAt, null);
});

test('un lot épuisé ou désactivé disparaît de la roue, et une roue vide ne consomme pas le code', async (context) => {
  const soldOut = { id: 'p1', kind: 'prize', label: 'Casquette', quantity: 3, awarded: 3, isActive: true };
  const inactive = { id: 'p2', kind: 'prize', label: 'Tablier', quantity: 5, awarded: 0, isActive: false };
  const code = { code: 'QWERTY', usedAt: null, expiresAt: new Date(Date.now() + 60000) };
  wheelSetup(context, { segments: [soldOut, inactive], code });

  await assert.rejects(wheelService.spin({ code: 'QWERTY', player: PLAYER }, 'fr', () => 0), (error) => error.status === 409 && error.code === 'WHEEL_EMPTY');
  assert.equal(code.usedAt, null);

  const lose = { id: 'l1', kind: 'lose', label: 'Pas cette fois', quantity: null, awarded: 0, isActive: true };
  wheelSetup(context, { segments: [soldOut, inactive, lose], code });
  const outcome = await wheelService.spin({ code: 'QWERTY', player: PLAYER }, 'fr', (length) => { assert.equal(length, 1); return 0; });
  assert.deepEqual(outcome.segments.map((segment) => segment.id), ['l1']);
  assert.equal(soldOut.awarded, 3);
});

test('les codes de roue expirés sans être joués sont effacés avant l’historique et avant un nouveau code', async (context) => {
  const calls = [];
  context.mock.method(wheelRepository, 'deleteExpiredCodes', async () => { calls.push('purge'); return 2; });
  context.mock.method(wheelRepository, 'findSegments', async () => []);
  context.mock.method(wheelRepository, 'findCodes', async () => { calls.push('history'); return []; });
  context.mock.method(wheelRepository, 'countPlayed', async () => 0);
  context.mock.method(wheelRepository, 'createCode', async (values) => { calls.push('create'); return { ...values }; });

  await wheelService.overview();
  assert.deepEqual(calls, ['purge', 'history']);

  calls.length = 0;
  await wheelService.generateCode({ id: 'admin-1' });
  assert.deepEqual(calls, ['purge', 'create']);
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
  assert.equal(meta.title, 'PIA · Stands · Hub de l’Investissement');
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

test('les réglages refusent un nombre de stands hors limites et une clé inconnue', () => {
  assert.ok(settingsValidation.update.validate({ requiredPassages: 0 }).error);
  assert.ok(settingsValidation.update.validate({ inconnu: true }).error);
  assert.ok(settingsValidation.update.validate({}).error);
  assert.equal(settingsValidation.update.validate({ wheelOpen: false, requiredPassages: 4 }).error, undefined);
});

test('un joueur ne tourne la roue qu’une fois par jour et le code reste valable', async (context) => {
  const prize = { id: 'p1', kind: 'prize', label: 'T-shirt', sponsor: null, quantity: 2, awarded: 0, isActive: true };
  const code = { code: 'AB23', usedAt: null, expiresAt: new Date(Date.now() + 60000) };
  wheelSetup(context, { segments: [prize], code, playsToday: 1 });
  await assert.rejects(wheelService.spin({ code: 'AB23', player: PLAYER }, 'fr', () => 0), (error) => error.status === 429 && error.code === 'WHEEL_DAILY_LIMIT');
  assert.equal(code.usedAt, null);
  assert.equal(prize.awarded, 0);
});

test('un lot gagné ne se remet qu’une fois, et seulement s’il a été gagné', async (context) => {
  const won = { code: 'WIN2', usedAt: new Date(), resultKind: 'prize', resultLabel: 'Casquette', claimedAt: null, player: { displayName: 'Ama' } };
  const lost = { code: 'LOS3', usedAt: new Date(), resultKind: 'lose', resultLabel: 'Presque !', claimedAt: null };
  context.mock.method(wheelRepository.sequelize, 'transaction', async (callback) => callback({ LOCK: { UPDATE: 'UPDATE' } }));
  context.mock.method(wheelRepository, 'findPlayedCodeForClaim', async (value) => ({ WIN2: won, LOS3: lost })[value] || null);
  context.mock.method(wheelRepository, 'updateCode', async (wheelCode, values) => Object.assign(wheelCode, values));
  const user = { id: 'animateur-a', firstName: 'Kossi', lastName: 'A.' };

  const claimed = await wheelService.claimPrize(user, 'win2');
  assert.equal(claimed.result.label, 'Casquette');
  assert.ok(won.claimedAt);
  assert.equal(won.claimedByUserId, 'animateur-a');
  await assert.rejects(wheelService.claimPrize(user, 'WIN2'), (error) => error.code === 'WHEEL_PRIZE_ALREADY_CLAIMED');
  await assert.rejects(wheelService.claimPrize(user, 'LOS3'), (error) => error.code === 'WHEEL_NO_PRIZE');
  await assert.rejects(wheelService.claimPrize(user, 'NOPE'), (error) => error.code === 'WHEEL_CODE_INVALID');
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
