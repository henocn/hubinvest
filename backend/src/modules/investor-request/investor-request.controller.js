const investorRequestService = require('./investor-request.service');
const publicLanguage = require('../../shared/public-language');

const list = async (request, response) => {
  response.json({ data: await investorRequestService.list(request.query) });
};

const createPublic = async (request, response) => {
  await investorRequestService.createPublic(request.body, publicLanguage(request));
  response.status(201).json({
    data: { received: true },
    message: 'Demande de rappel transmise à l’API-ZF.',
  });
};

// Rendez-vous aux guichets réservé depuis le site.
const publicSlots = async (request, response) => response.json({ data: await investorRequestService.publicSlots(request.query.guichet) });
const book = async (request, response) => response.status(201).json({ data: await investorRequestService.book(request.body, publicLanguage(request)), message: 'Rendez-vous réservé.' });

const createManual = async (request, response) => {
  const investorRequest = await investorRequestService.createManual(request.body);
  response.status(201).json({ data: investorRequest, message: 'Demande ajoutée.' });
};

const update = async (request, response) => {
  const investorRequest = await investorRequestService.update(request.params.id, request.body);
  response.json({ data: investorRequest, message: 'Suivi mis à jour.' });
};

// Fiche d'une demande : qualification, classe, interlocuteur, relances et rendez-vous.
const detail = async (request, response) => response.json({ data: await investorRequestService.detail(request.params.id) });
const saveDiagnosis = async (request, response) => response.json({ data: await investorRequestService.saveDiagnosis(request.params.id, request.body), message: 'Diagnostic enregistré.' });
// Fiche de diagnostic en PDF, téléchargée depuis la fiche du contact.
const diagnosisPdf = async (request, response) => {
  const { buffer, fileName } = await investorRequestService.diagnosisPdf(request.params.id);
  response.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${fileName}"`, 'Cache-Control': 'no-store' });
  response.send(buffer);
};
const saveDifficulty = async (request, response) => response.json({ data: await investorRequestService.saveDifficulty(request.params.id, request.body), message: 'Fiche enregistrée.' });
const resolve = async (request, response) => response.json({ data: await investorRequestService.resolve(request.params.id, request.body), message: request.body.resolved ? 'Réponse enregistrée.' : 'Engagement rouvert.' });
const addFollowUp = async (request, response) => response.status(201).json({ data: await investorRequestService.addFollowUp(request.user, request.params.id, request.body), message: 'Relance ajoutée.' });
const completeFollowUp = async (request, response) => response.json({ data: await investorRequestService.completeFollowUp(request.user, request.params.id, request.params.followUpId, request.body), message: 'Relance marquée faite.' });
const removeFollowUp = async (request, response) => {
  await investorRequestService.removeFollowUp(request.params.id, request.params.followUpId);
  response.status(204).end();
};
const addMeeting = async (request, response) => response.status(201).json({ data: await investorRequestService.addMeeting(request.user, request.params.id, request.body), message: 'Rendez-vous fixé.' });
const updateMeeting = async (request, response) => response.json({ data: await investorRequestService.updateMeeting(request.params.id, request.params.meetingId, request.body), message: 'Rendez-vous déplacé.' });
const setMeetingStatus = async (request, response) => response.json({ data: await investorRequestService.setMeetingStatus(request.params.id, request.params.meetingId, request.body.status), message: request.body.status === 'held' ? 'Rendez-vous validé.' : 'Rendez-vous annulé.' });
const removeMeeting = async (request, response) => {
  await investorRequestService.removeMeeting(request.params.id, request.params.meetingId);
  response.status(204).end();
};

module.exports = { list, createPublic, publicSlots, book, createManual, saveDiagnosis, diagnosisPdf, saveDifficulty, resolve, update, detail, addFollowUp, completeFollowUp, removeFollowUp, addMeeting, updateMeeting, setMeetingStatus, removeMeeting };
