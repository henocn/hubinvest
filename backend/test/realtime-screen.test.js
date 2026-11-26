const test = require('node:test');
const assert = require('node:assert/strict');
const hub = require('../src/modules/realtime/realtime.hub');
const { events, channels } = require('../src/modules/realtime/realtime.service');

test('le grand écran est prévenu de ce qu’il affiche, et seulement de cela', (context) => {
  const published = [];
  context.mock.method(hub, 'publish', (targets, topic) => { published.push({ targets, topic }); return 1; });
  const reaches = () => published.filter((item) => item.targets.includes(channels.screen)).map((item) => item.topic);

  events.settingsChanged();
  events.occupantsChanged('stand-a');
  events.programChanged();
  events.studioChanged('stand-a');
  events.challengeChanged({ passportId: 'p1', occupantIds: ['stand-a'] });
  events.b2bChanged('stand-a');
  events.investorRequestsChanged();
  assert.deepEqual(reaches(), ['settings', 'occupants', 'program', 'studio', 'challenge', 'b2b', 'investor-requests']);

  // Les sujets propres à l'équipe (contacts des stands, comptes, questions du public) ne passent jamais par l'écran.
  published.length = 0;
  events.contactsChanged('stand-a');
  events.usersChanged();
  events.accountChanged('user-a');
  events.liveQuestionsChanged();
  events.wheelChanged();
  assert.deepEqual(reaches(), []);
});
