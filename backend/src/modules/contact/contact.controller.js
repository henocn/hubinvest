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
    message: result.created ? 'Contact enregistre.' : 'Contact deja synchronise.',
  });
};

const update = async (request, response) => {
  const contact = await contactService.update(request.user, request.params.id, request.body);
  response.json({ data: contact, message: 'Contact modifie.' });
};

const stats = async (request, response) => {
  response.json({ data: await contactService.stats(request.user) });
};

const adminStats = async (request, response) => {
  response.json({ data: await contactService.adminStats(request.user) });
};

module.exports = { list, get, create, update, stats, adminStats };
