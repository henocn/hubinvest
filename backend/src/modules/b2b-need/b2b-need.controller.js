const b2bNeedService = require('./b2b-need.service');
const publicLanguage = require('../../shared/public-language');

const listPublic = async (request, response) => response.json({ data: await b2bNeedService.listPublic(publicLanguage(request)) });
const getPublic = async (request, response) => response.json({ data: await b2bNeedService.getPublic(request.params.id, publicLanguage(request)) });
const list = async (request, response) => response.json({ data: await b2bNeedService.list(request.user) });
const create = async (request, response) => response.status(201).json({ data: await b2bNeedService.create(request.user, request.body), message: 'Besoin publié.' });
const update = async (request, response) => response.json({ data: await b2bNeedService.update(request.user, request.params.id, request.body), message: 'Besoin mis à jour.' });

module.exports = { listPublic, getPublic, list, create, update };
