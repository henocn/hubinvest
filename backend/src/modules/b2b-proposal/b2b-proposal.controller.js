const b2bProposalService = require('./b2b-proposal.service');
const publicLanguage = require('../../shared/public-language');

const createPublic = async (request, response) => {
  await b2bProposalService.createPublic(request.params.needId, request.body, publicLanguage(request));
  response.status(201).json({ data: { received: true }, message: 'Proposition transmise.' });
};
const list = async (request, response) => response.json({ data: await b2bProposalService.list(request.user, request.params.needId) });
const listAll = async (request, response) => response.json({ data: await b2bProposalService.listAll(request.user) });
const update = async (request, response) => response.json({ data: await b2bProposalService.update(request.user, request.params.id, request.body), message: 'Proposition mise à jour.' });

module.exports = { createPublic, list, listAll, update };
