const { Op } = require('sequelize');
const { ProgramEvent, Occupant } = require('../../models');

const occupantInclude = (attributes, publicOnly = false) => [{
  model: Occupant,
  as: 'occupant',
  attributes,
  required: false,
  ...(publicOnly && { where: { status: 'active' } }),
}];

const adminOccupantAttributes = ['id', 'name', 'standLabel'];
const publicOccupantAttributes = ['id', 'name', 'slug', 'standLabel', 'activity', 'coverImageUrl', 'logoUrl'];

// Liste tout le programme pour le backoffice, du plus ancien au plus récent.
const findAll = () => ProgramEvent.findAll({
  include: occupantInclude(adminOccupantAttributes),
  order: [['startsAt', 'ASC']],
});

// Retrouve un élément du programme par son identifiant.
const findById = (id) => ProgramEvent.findByPk(id, { include: occupantInclude(adminOccupantAttributes) });

// Retrouve l'occupant à l'affiche d'une journée, en excluant éventuellement un élément en cours de modification.
const findSpotlightOn = (dayStart, dayEnd, excludedId = null) => ProgramEvent.findOne({
  where: {
    type: 'spotlight',
    startsAt: { [Op.gte]: dayStart, [Op.lt]: dayEnd },
    ...(excludedId && { id: { [Op.ne]: excludedId } }),
  },
});

// Retrouve l'occupant actif mis à l'affiche sur une journée pour l'accueil public.
const findPublicSpotlight = (dayStart, dayEnd) => ProgramEvent.findOne({
  where: { type: 'spotlight', startsAt: { [Op.gte]: dayStart, [Op.lt]: dayEnd } },
  include: [{ ...occupantInclude(publicOccupantAttributes, true)[0], required: true }],
  order: [['startsAt', 'ASC']],
});

// Liste les éléments du programme public qui commencent dans un intervalle donné.
const findPublicBetween = (from, to, limit = null) => ProgramEvent.findAll({
  where: {
    type: { [Op.ne]: 'spotlight' },
    startsAt: { [Op.gte]: from, ...(to && { [Op.lt]: to }) },
  },
  include: occupantInclude(['id', 'name', 'slug', 'standLabel'], true),
  order: [['startsAt', 'ASC']],
  ...(limit && { limit }),
});

// Vérifie qu'un stand existe avant de l'associer au programme.
const findOccupantById = (id) => Occupant.findByPk(id, { attributes: ['id'] });

// Crée un élément du programme.
const create = (values) => ProgramEvent.create(values);

// Met à jour un élément du programme.
const update = (event, values) => event.update(values);

// Supprime un élément du programme.
const remove = (event) => event.destroy();

module.exports = {
  findAll,
  findById,
  findSpotlightOn,
  findPublicSpotlight,
  findPublicBetween,
  findOccupantById,
  create,
  update,
  remove,
};
