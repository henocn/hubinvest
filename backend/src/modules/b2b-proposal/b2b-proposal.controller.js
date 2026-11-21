const b2bProposalService = require('./b2b-proposal.service');
const b2bMeetingService = require('./b2b-meeting.service');
const publicLanguage = require('../../shared/public-language');

const createPublic = async (request, response) => {
  await b2bProposalService.createPublic(request.params.needId, request.body, publicLanguage(request));
  response.status(201).json({ data: { received: true }, message: 'Proposition transmise.' });
};
const list = async (request, response) => response.json({ data: await b2bProposalService.list(request.user, request.params.needId) });
const listAll = async (request, response) => response.json({ data: await b2bProposalService.listAll(request.user) });
const update = async (request, response) => response.json({ data: await b2bProposalService.update(request.user, request.params.id, request.body), message: 'Proposition mise à jour.' });

const remove = async (request, response) => {
  await b2bProposalService.remove(request.user, request.params.id);
  response.status(204).end();
};

// Page de détail d'une demande : rendez-vous, créneaux libres, compte rendu.
const detail = async (request, response) => response.json({ data: await b2bMeetingService.detail(request.user, request.params.id) });
const slots = async (request, response) => response.json({ data: await b2bMeetingService.slots(request.user, request.params.id, request.query.date, request.query.exclude || null) });
const reschedule = async (request, response) => response.json({ data: await b2bMeetingService.reschedule(request.user, request.params.id, request.params.meetingId, request.body), message: 'Rendez-vous déplacé.' });
const schedule = async (request, response) => response.status(201).json({ data: await b2bMeetingService.schedule(request.user, request.params.id, request.body), message: 'Rendez-vous fixé.' });
const report = async (request, response) => response.json({ data: await b2bMeetingService.report(request.user, request.params.id, request.params.meetingId, request.body), message: 'Compte rendu enregistré.' });

const cancel = async (request, response) => {
  await b2bMeetingService.cancel(request.user, request.params.id, request.params.meetingId);
  response.status(204).end();
};

module.exports = { createPublic, list, listAll, update, remove, detail, slots, schedule, report, cancel, reschedule };
