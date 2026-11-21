const { Service, OnlineProcedure, sequelize } = require('../../models');

const order = [['position', 'ASC'], ['createdAt', 'ASC']];
const models = { services: Service, procedures: OnlineProcedure };

const findServices = (publishedOnly = false) => Service.findAll({ where: publishedOnly ? { published: true } : {}, order });
const findProcedures = (publishedOnly = false) => OnlineProcedure.findAll({ where: publishedOnly ? { published: true } : {}, order });
const findById = (kind, id) => models[kind].findByPk(id);
const nextPosition = async (kind) => ((await models[kind].max('position')) || 0) + 1;
const create = (kind, values) => models[kind].create(values);
const update = (item, values) => item.update(values);
const destroy = (item) => item.destroy();

// Range les éléments dans l'ordre donné ; les identifiants inconnus sont ignorés.
const reorder = (kind, ids) => sequelize.transaction(async (transaction) => {
  for (const [index, id] of ids.entries()) {
    await models[kind].update({ position: index + 1 }, { where: { id }, transaction });
  }
});

module.exports = { findServices, findProcedures, findById, nextPosition, create, update, destroy, reorder };
