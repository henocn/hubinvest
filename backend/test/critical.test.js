const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { UniqueConstraintError } = require('sequelize');
const contactService = require('../src/modules/contact/contact.service');
const contactRepository = require('../src/modules/contact/contact.repository');
const { authenticate } = require('../src/middlewares/auth.middleware');
const { User } = require('../src/models');
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
