const serviceService = require('./service.service');
const publicLanguage = require('../../shared/public-language');

const getPublic = async (request, response) => response.json({ data: await serviceService.getPublic(publicLanguage(request)) });
const list = async (request, response) => response.json({ data: await serviceService.list() });

// Les mêmes actions servent aux services et aux démarches en ligne.
const actions = (kind, created, updated, removed) => ({
  create: async (request, response) => response.status(201).json({ data: await serviceService.create(kind, request.body), message: created }),
  update: async (request, response) => response.json({ data: await serviceService.update(kind, request.params.id, request.body), message: updated }),
  remove: async (request, response) => {
    await serviceService.remove(kind, request.params.id);
    response.json({ message: removed });
  },
  reorder: async (request, response) => response.json({ data: await serviceService.reorder(kind, request.body.ids) }),
});

const services = actions('services', 'Service ajouté.', 'Service mis à jour.', 'Service supprimé.');
const procedures = actions('procedures', 'Démarche ajoutée.', 'Démarche mise à jour.', 'Démarche supprimée.');

module.exports = { getPublic, list, services, procedures };
