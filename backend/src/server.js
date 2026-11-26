const app = require('./app');
const env = require('./config/env');
const sequelize = require('./database/sequelize');
const notificationWorker = require('./modules/notification/notification.worker');
const realtimeService = require('./modules/realtime/realtime.service');
const settingsService = require('./modules/settings/settings.service');

const server = app.listen(env.port, () => {
  console.log(`HubInvest API ecoute sur le port ${env.port}`);
  if (env.notifications.enabled && env.notifications.workerEnabled) notificationWorker.start();
  // Réglages de l'administration chargés en mémoire ; sans table (migration pas encore passée), les valeurs par défaut restent.
  // Puis les vidéos de repli abandonnées sont retirées (seulement une fois les réglages lus, pour garder la vidéo actuelle).
  settingsService.load()
    .then(() => settingsService.cleanScreenVideos())
    .catch((error) => console.error('Réglages non chargés, valeurs par défaut utilisées.', error.message));
});

// Arrête proprement le serveur, le traitement des notifications puis la base.
// Les flux en temps réel restent ouverts indéfiniment : ils sont fermés d'abord pour que l'arrêt aboutisse.
const shutdown = async () => {
  realtimeService.closeAll();
  server.close(async () => {
    await notificationWorker.stop();
    await sequelize.close();
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = server;
