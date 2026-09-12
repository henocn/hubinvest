const occupantService = require('./occupant.service');

const list = async (request, response) => {
  response.json({ data: await occupantService.list() });
};

const listPublic = async (request, response) => {
  response.json({ data: await occupantService.listPublic() });
};

const get = async (request, response) => {
  response.json({ data: await occupantService.get(request.params.id) });
};

const getPublic = async (request, response) => {
  response.json({ data: await occupantService.getPublic(request.params.slug) });
};

const create = async (request, response) => {
  const occupant = await occupantService.create(request.body);
  response.status(201).json({ data: occupant, message: 'Occupant créé.' });
};

const update = async (request, response) => {
  const occupant = await occupantService.update(request.params.id, request.body);
  response.json({ data: occupant, message: 'Occupant modifié.' });
};

const updateCover = async (request, response) => {
  const occupant = await occupantService.updateCover(request.params.id, request.file);
  response.json({ data: occupant, message: 'Image de couverture modifiée.' });
};

const remove = async (request, response) => {
  await occupantService.remove(request.params.id);
  response.status(204).send();
};

module.exports = { list, listPublic, get, getPublic, create, update, updateCover, remove };
