const contactService = require('./contact.service');

const list = async (request, response) => {
  response.json({ data: await contactService.list(request.user, request.query) });
};

const get = async (request, response) => {
  response.json({ data: await contactService.get(request.user, request.params.id) });
};

const create = async (request, response) => {
  const result = await contactService.create(request.user, request.body);
  response.status(result.created ? 201 : 200).json({
    data: result.contact,
    message: result.created ? 'Contact enregistré.' : 'Contact déjà synchronisé.',
  });
};

const createPublic = async (request, response) => {
  const result = await contactService.createPublic(request.params.slug, request.body);
  response.status(result.created ? 201 : 200).json({
    data: { received: true },
    message: 'Demande enregistrée.',
  });
};

const update = async (request, response) => {
  const contact = await contactService.update(request.user, request.params.id, request.body);
  response.json({ data: contact, message: 'Contact modifié.' });
};

const stats = async (request, response) => {
  response.json({ data: await contactService.stats(request.user) });
};

const adminStats = async (request, response) => {
  response.json({ data: await contactService.adminStats(request.user) });
};

const standContacts = async (request, response) => response.json({ data: await contactService.standContacts(request.params.occupantId) });

module.exports = { list, get, create, createPublic, update, stats, adminStats, standContacts };
