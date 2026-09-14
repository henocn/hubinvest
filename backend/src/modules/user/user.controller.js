const userService = require('./user.service');

const list = async (request, response) => {
  response.json({ data: await userService.list() });
};

const get = async (request, response) => {
  response.json({ data: await userService.get(request.params.id) });
};

const getProfile = async (request, response) => {
  response.json({ data: await userService.getProfile(request.user) });
};

const changePassword = async (request, response) => {
  await userService.changePassword(request.user, request.body);
  response.json({ data: null, message: 'Mot de passe modifié.' });
};

const create = async (request, response) => {
  const user = await userService.create(request.user, request.body);
  response.status(201).json({ data: user, message: 'Utilisateur créé.' });
};

const update = async (request, response) => {
  const user = await userService.update(request.user, request.params.id, request.body);
  response.json({ data: user, message: 'Utilisateur modifié.' });
};

const remove = async (request, response) => {
  await userService.remove(request.user, request.params.id);
  response.status(204).send();
};

module.exports = { list, get, getProfile, changePassword, create, update, remove };
