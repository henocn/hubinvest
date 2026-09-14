const b2bNeedService = require('./b2b-need.service');

const listPublic = async (request, response) => response.json({ data: await b2bNeedService.listPublic() });
const getPublic = async (request, response) => response.json({ data: await b2bNeedService.getPublic(request.params.id) });
const list = async (request, response) => response.json({ data: await b2bNeedService.list(request.user) });
const create = async (request, response) => response.status(201).json({ data: await b2bNeedService.create(request.user, request.body), message: 'Besoin publié.' });
const update = async (request, response) => response.json({ data: await b2bNeedService.update(request.user, request.params.id, request.body), message: 'Besoin mis à jour.' });

module.exports = { listPublic, getPublic, list, create, update };
