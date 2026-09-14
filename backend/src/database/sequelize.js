const { Sequelize } = require('sequelize');
const env = require('../config/env');

const sequelize = new Sequelize(
  env.database.name,
  env.database.user,
  env.database.password,
  {
    host: env.database.host,
    port: env.database.port,
    dialect: env.database.dialect,
    logging: false,
    define: {
      underscored: true,
    },
  },
);

module.exports = sequelize;
