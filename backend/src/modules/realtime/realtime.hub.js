const env = require('../../config/env');

// Écrans connectés au flux, chacun abonné à quelques canaux (rôle, stand, compte, parcours).
const clients = new Set();

// Écrit un événement SSE ; une connexion déjà fermée est simplement ignorée.
const write = (client, chunk) => {
  if (client.response.writableEnded || client.response.destroyed) return;
  client.response.write(chunk);
};

// Ferme une connexion et la retire du registre.
const close = (client) => {
  if (!clients.has(client)) return;
  clients.delete(client);
  clearInterval(client.heartbeat);
  clearTimeout(client.expiry);
  if (!client.response.writableEnded) client.response.end();
};

// Compte les connexions ouvertes pour une même clé (compte ou parcours).
const countByKey = (key) => {
  let count = 0;
  clients.forEach((client) => { if (client.key === key) count += 1; });
  return count;
};

// Ouvre un flux SSE et l'abonne aux canaux donnés jusqu'à sa fermeture ou son expiration.
const open = (request, response, { key, channels, maxDuration = env.realtime.maxStreamDuration }) => {
  response.status(200).set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  response.flushHeaders();
  request.socket.setKeepAlive(true);
  request.socket.setNoDelay(true);
  request.socket.setTimeout(0);

  const client = { key, channels: new Set(channels), response };
  client.heartbeat = setInterval(() => write(client, ': ping\n\n'), env.realtime.heartbeatInterval);
  client.expiry = setTimeout(() => {
    write(client, 'event: reconnect\ndata: {}\n\n');
    close(client);
  }, Math.max(1000, maxDuration));

  clients.add(client);
  request.on('close', () => close(client));
  write(client, `event: ready\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`);
  return client;
};

// Prévient les écrans abonnés à l'un des canaux qu'un sujet a changé.
const publish = (channels, topic) => {
  if (!env.realtime.enabled || clients.size === 0) return 0;
  const targets = new Set(channels.filter(Boolean));
  if (targets.size === 0) return 0;

  const chunk = `event: ${topic}\ndata: ${JSON.stringify({ topic, at: new Date().toISOString() })}\n\n`;
  let delivered = 0;
  clients.forEach((client) => {
    for (const channel of client.channels) {
      if (targets.has(channel)) {
        try {
          write(client, chunk);
          delivered += 1;
        } catch {
          close(client);
        }
        break;
      }
    }
  });
  return delivered;
};

// Ferme tous les flux, par exemple avant l'arrêt du serveur.
const closeAll = () => {
  [...clients].forEach((client) => {
    write(client, 'event: reconnect\ndata: {}\n\n');
    close(client);
  });
};

const size = () => clients.size;

module.exports = { open, publish, close, closeAll, countByKey, size };
