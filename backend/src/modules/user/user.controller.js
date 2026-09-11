const userService = require('./user.service');

const list = async (request, response) => {
  response.json({ data: await userService.list() });
};

const get = async (request, response) => {
  response.json({ data: await userService.get(request.params.id) });
};

const create = async (request, response) => {
  const user = await userService.create(request.user, request.body);
  response.status(201).json({ data: user, message: 'Utilisateur cree.' });
};

const update = async (request, response) => {
  const user = await userService.update(request.user, request.params.id, request.body);
  response.json({ data: user, message: 'Utilisateur modifie.' });
};

const remove = async (request, response) => {
  await userService.remove(request.user, request.params.id);
  response.status(204).send();
};

module.exports = { list, get, create, update, remove };
