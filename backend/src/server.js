const app = require('./app');
const env = require('./config/env');
const sequelize = require('./database/sequelize');
const notificationWorker = require('./modules/notification/notification.worker');

const server = app.listen(env.port, () => {
  console.log(`HubInvest API ecoute sur le port ${env.port}`);
  if (env.notifications.enabled && env.notifications.workerEnabled) notificationWorker.start();
});

// Arrête proprement le serveur, le traitement des notifications puis la base.
const shutdown = async () => {
  server.close(async () => {
    await notificationWorker.stop();
    await sequelize.close();
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = server;
