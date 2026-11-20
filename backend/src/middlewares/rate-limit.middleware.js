const AppError = require('../shared/app-error');

// Limite d'essais en mémoire, par fenêtre de temps. Au Hub, beaucoup de visiteurs partagent la même adresse (Wi-Fi, réseau mobile) :
// on compte donc d'abord par personne (adresse + e-mail ou téléphone saisi), et seulement très largement par adresse seule.
// « failuresOnly » ne compte que les réponses en échec (mauvais mot de passe…), pour ne jamais gêner un usage normal.
const rateLimit = ({ windowMs, max, key, code = 'RATE_LIMITED', message = 'Trop de demandes. Réessayez dans quelques minutes.', failuresOnly = false }) => {
  const hits = new Map();
  const purge = (now) => {
    if (hits.size <= 5000) return;
    hits.forEach((entry, entryKey) => { if (entry.expiresAt <= now) hits.delete(entryKey); });
  };
  const count = (entryKey) => {
    const now = Date.now();
    purge(now);
    const entry = hits.get(entryKey);
    if (!entry || entry.expiresAt <= now) hits.set(entryKey, { count: 1, expiresAt: now + windowMs });
    else entry.count += 1;
  };

  return (request, response, next) => {
    const entryKey = key(request);
    if (!entryKey) return next();
    const entry = hits.get(entryKey);
    if (entry && entry.expiresAt > Date.now() && entry.count >= max) return next(new AppError(429, code, message));
    if (failuresOnly) response.on('finish', () => { if (response.statusCode >= 400 && response.statusCode !== 429) count(entryKey); });
    else count(entryKey);
    return next();
  };
};

const normalized = (value) => String(value || '').trim().toLowerCase();

// Un formulaire public : 5 envois par personne et par quart d'heure, 200 par adresse (réseau partagé).
const publicForm = (name) => {
  const perPerson = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    key: (request) => {
      const identity = normalized(request.body?.email) || normalized(request.body?.phone) || normalized(request.body?.contact) || normalized(request.body?.fullName);
      return identity && `${name}:${request.ip}:${identity}`;
    },
  });
  const perAddress = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, key: (request) => `${name}:${request.ip}` });
  return [perAddress, perPerson];
};

// Connexion : 10 échecs par compte et par adresse en un quart d'heure, puis attente.
const login = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  failuresOnly: true,
  key: (request) => `login:${request.ip}:${normalized(request.body?.email)}`,
  code: 'LOGIN_RATE_LIMITED',
  message: 'Trop de tentatives de connexion. Réessayez dans quelques minutes.',
});

module.exports = { rateLimit, publicForm, login };
