const investorRequestService = require('./investor-request.service');
const publicLanguage = require('../../shared/public-language');

const list = async (request, response) => {
  response.json({ data: await investorRequestService.list(request.query) });
};

const createPublic = async (request, response) => {
  await investorRequestService.createPublic(request.body, publicLanguage(request));
  response.status(201).json({
    data: { received: true },
    message: 'Demande transmise à l’Investor Desk.',
  });
};

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
const addFollowUp = async (request, response) => response.status(201).json({ data: await investorRequestService.addFollowUp(request.user, request.params.id, request.body), message: 'Relance enregistrée.' });
const removeFollowUp = async (request, response) => {
  await investorRequestService.removeFollowUp(request.params.id, request.params.followUpId);
  response.status(204).end();
};
const addMeeting = async (request, response) => response.status(201).json({ data: await investorRequestService.addMeeting(request.user, request.params.id, request.body), message: 'Rendez-vous fixé.' });
const updateMeeting = async (request, response) => response.json({ data: await investorRequestService.updateMeeting(request.params.id, request.params.meetingId, request.body), message: 'Rendez-vous déplacé.' });
const removeMeeting = async (request, response) => {
  await investorRequestService.removeMeeting(request.params.id, request.params.meetingId);
  response.status(204).end();
};

module.exports = { list, createPublic, createManual, update, detail, addFollowUp, removeFollowUp, addMeeting, updateMeeting, removeMeeting };
