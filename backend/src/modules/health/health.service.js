const sequelize = require('../../database/sequelize');

const checkDatabase = async () => {
  await sequelize.authenticate();
  return true;
};

module.exports = { checkDatabase };
