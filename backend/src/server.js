const app = require('./app');
const env = require('./config/env');
const sequelize = require('./database/sequelize');

const server = app.listen(env.port, () => {
  console.log(`HubInvest API ecoute sur le port ${env.port}`);
});

const shutdown = async () => {
  server.close(async () => {
    await sequelize.close();
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = server;
