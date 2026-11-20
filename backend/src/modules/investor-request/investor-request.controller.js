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

module.exports = { list, createPublic, createManual, update };
