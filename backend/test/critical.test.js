const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { UniqueConstraintError } = require('sequelize');
const contactService = require('../src/modules/contact/contact.service');
const contactRepository = require('../src/modules/contact/contact.repository');
const occupantService = require('../src/modules/occupant/occupant.service');
const occupantRepository = require('../src/modules/occupant/occupant.repository');
const investorRequestService = require('../src/modules/investor-request/investor-request.service');
const investorRequestRepository = require('../src/modules/investor-request/investor-request.repository');
const investorRequestValidation = require('../src/modules/investor-request/investor-request.validation');
const { authenticate } = require('../src/middlewares/auth.middleware');
const { User, Occupant } = require('../src/models');
const env = require('../src/config/env');
const app = require('../src/app');

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

test('les totaux administrateur proviennent des groupes et restent interdits aux occupants', async (context) => {
  context.mock.method(contactRepository, 'countByOccupant', async () => [
    { occupantId: 'occupant-a', count: '2' },
    { occupantId: 'occupant-b', count: '3' },
  ]);

  await assert.rejects(
    contactService.adminStats({ role: 'occupant-responsable', occupantId: 'occupant-a' }),
    (error) => error.status === 403 && error.code === 'FORBIDDEN',
  );

  const result = await contactService.adminStats({ role: 'admin-apizf' });
  assert.deepEqual(result, {
    total: 5,
    byOccupant: { 'occupant-a': 2, 'occupant-b': 3 },
  });
});

test('la route des totaux refuse un jeton occupant et accepte un administrateur', async (context) => {
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
        role: isAdmin ? 'admin-apizf' : 'occupant-responsable',
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

test('le premier suivi Investor Desk attribue la demande à son agent', async (context) => {
  const investorRequest = { id: 'request-a', assignedToUserId: null };
  let saved;
  context.mock.method(investorRequestRepository, 'findById', async () => investorRequest);
  context.mock.method(investorRequestRepository, 'update', async (_request, values) => {
    saved = values;
    return values;
  });

  await investorRequestService.update(
    { id: 'agent-a', role: 'investor-desk' },
    investorRequest.id,
    { status: 'in_progress', nextAction: 'Rappeler le porteur du projet' },
  );

  assert.equal(saved.assignedToUserId, 'agent-a');
  assert.equal(saved.status, 'in_progress');
});
