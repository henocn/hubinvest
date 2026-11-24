const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../src/config');
const db = require('../src/db');
const email = require('../src/channels/email');
const whatsapp = require('../src/channels/whatsapp');
const worker = require('../src/worker');

test.after(() => db.close());

const job = (values) => ({ id: 'job-1', attempts: 1, ...values });
const recordDb = (context) => {
  const marks = [];
  context.mock.method(db, 'markSent', async (id, note) => { marks.push(['sent', note]); });
  context.mock.method(db, 'markRetry', async (id, reason) => { marks.push(['retry', reason]); });
  context.mock.method(db, 'markFailed', async (id, reason) => { marks.push(['failed', reason]); });
  return marks;
};

test('le message WhatsApp suit le format de Meta : chiffres seuls, modèle, langue, variables dans l’ordre', () => {
  assert.equal(whatsapp.toWhatsappNumber('+228 90 12 34 56'), '22890123456');
  const body = whatsapp.messageBody('+22890123456', { template: 'hub26_rdv_rappel', language: 'en', params: ['Kossi', 'B2B with BRMN', 'Thursday', 'table 2'] });
  assert.equal(body.to, '22890123456');
  assert.deepEqual(body.template.language, { code: 'en' });
  assert.deepEqual(body.template.components[0].parameters.map((item) => item.text), ['Kossi', 'B2B with BRMN', 'Thursday', 'table 2']);
});

test('une erreur de débit de Meta se réessaie ; un numéro sans WhatsApp ou un modèle absent, non', () => {
  assert.equal(whatsapp.classify(400, { code: 131056 }).retryable, true);
  assert.equal(whatsapp.classify(503, {}).retryable, true);
  assert.equal(whatsapp.classify(400, { code: 131026 }).retryable, false);
  assert.equal(whatsapp.classify(404, { code: 132001 }).retryable, false);
});

test('WhatsApp impossible pour ce numéro : l’e-mail de repli part et la notification est notée envoyée', async (context) => {
  const marks = recordDb(context);
  const sentEmails = [];
  context.mock.method(whatsapp, 'isConfigured', () => true);
  context.mock.method(whatsapp, 'send', async () => { throw whatsapp.classify(400, { code: 131026, message: 'Message undeliverable' }); });
  context.mock.method(email, 'send', async (to, payload) => { sentEmails.push([to, payload.subject]); });
  const payload = { template: 'hub26_rdv_rappel', params: ['Kossi'], fallback: { recipient: 'k@exemple.tg', subject: 'Rappel', text: 'Nous vous attendons.' } };
  await worker.processJob(job({ channel: 'whatsapp', recipient: '+22890123456', payload }), { recipientsToday: new Set() });
  assert.deepEqual(sentEmails, [['k@exemple.tg', 'Rappel']]);
  assert.equal(marks[0][0], 'sent');
  assert.match(marks[0][1], /^Repli e-mail/);
});

test('erreur passagère de Meta : la notification est replacée dans la file', async (context) => {
  const marks = recordDb(context);
  context.mock.method(whatsapp, 'isConfigured', () => true);
  context.mock.method(whatsapp, 'send', async () => { throw whatsapp.classify(429, { code: 130429 }); });
  await worker.processJob(job({ channel: 'whatsapp', recipient: '22890123456', payload: { template: 'hub26_rdv_confirme', params: [] } }), { recipientsToday: new Set() });
  assert.equal(marks[0][0], 'retry');
});

test('plafond du jour atteint : une nouvelle personne reçoit l’e-mail, une personne déjà jointe reçoit encore WhatsApp', async (context) => {
  recordDb(context);
  const sentEmails = [];
  const sentWhatsapp = [];
  context.mock.method(whatsapp, 'isConfigured', () => true);
  context.mock.method(whatsapp, 'send', async (to) => { sentWhatsapp.push(to); });
  context.mock.method(email, 'send', async (to) => { sentEmails.push(to); });
  const previous = config.whatsapp.dailyRecipients;
  config.whatsapp.dailyRecipients = 1;
  context.after(() => { config.whatsapp.dailyRecipients = previous; });
  const recipientsToday = new Set(['22890000001']);
  const payload = { template: 'hub26_rdv_rappel', params: [], fallback: { recipient: 'b@exemple.tg', subject: 'Rappel', text: '…' } };
  await worker.processJob(job({ channel: 'whatsapp', recipient: '+22890000002', payload }), { recipientsToday });
  await worker.processJob(job({ channel: 'whatsapp', recipient: '+22890000001', payload }), { recipientsToday });
  assert.deepEqual(sentEmails, ['b@exemple.tg']);
  assert.deepEqual(sentWhatsapp, ['22890000001']);
});

test('sans e-mail de repli et sans WhatsApp, la notification est abandonnée sans réessai', async (context) => {
  const marks = recordDb(context);
  context.mock.method(whatsapp, 'isConfigured', () => false);
  await worker.processJob(job({ channel: 'whatsapp', recipient: '22890123456', payload: { template: 'hub26_rdv_annule', params: [] } }), { recipientsToday: new Set() });
  assert.equal(marks[0][0], 'failed');
});
