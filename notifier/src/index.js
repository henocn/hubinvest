const db = require('./db');
const worker = require('./worker');

// Service d'envoi des notifications HubInvest : aucun port ouvert, il lit la file de la base et envoie.
const shutdown = async () => {
  await worker.stop();
  await db.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

worker.start();
