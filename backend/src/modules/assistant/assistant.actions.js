const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const AppError = require('../../shared/app-error');
const { accessRole } = require('./assistant.guide');
const { findTool } = require('./assistant.tools');

// Exécution des outils de l'agent : chaque appel passe par l'API de HubInvest, avec la session du compte connecté.
// Les routes appliquent leurs droits et leurs validations, et le journal inscrit l'action au nom de la personne.

const WRITE_METHODS = ['POST', 'PUT', 'PATCH'];
const ACTION_TTL = '15m'; // une action préparée doit être confirmée dans ce délai
const AUDIENCE = 'hubinvest-assistant-action';
// Une action ne s'exécute qu'une fois, même après un double clic : les actions déjà confirmées sont gardées le temps
// de leur validité.
const used = new Map();
const markUsed = (jti, expiresAt) => {
  const now = Date.now();
  used.forEach((expiry, key) => { if (expiry <= now) used.delete(key); });
  if (used.has(jti)) return false;
  used.set(jti, expiresAt);
  return true;
};

// Une requête à l'API, comme l'espace équipe la ferait pour ce compte.
// Jamais de suppression : la méthode DELETE est refusée ici, quelle que soit la demande.
const call = async ({ method, path, query, body }, session) => {
  if (method === 'DELETE' || !['GET', ...WRITE_METHODS].includes(method)) throw new AppError(403, 'ASSISTANT_FORBIDDEN', 'L’assistant ne supprime rien.');
  if (!path.startsWith('/') || path.includes('..')) throw new AppError(400, 'ASSISTANT_BAD_PATH', 'Adresse invalide.');
  const url = new URL(`http://127.0.0.1:${env.port}/api${path}`);
  Object.entries(query || {}).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: session.authorization,
      'Content-Type': 'application/json',
      'Accept-Language': 'fr',
      // L'API fait confiance à cet en-tête venant de la machine elle-même : le journal garde l'adresse de la personne.
      ...(session.ip && { 'X-Forwarded-For': session.ip }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = (payload.details || []).map((item) => item.message).join(' ; ');
    throw new AppError(response.status, payload.code || 'ASSISTANT_CALL_FAILED', `${payload.message || 'La requête a échoué.'}${details ? ` (${details})` : ''}`);
  }
  return payload.data;
};

// Un outil existe et est ouvert au rôle du compte.
const allowedTool = (user, name) => {
  const tool = findTool(name);
  return tool && tool.roles.includes(accessRole(user)) ? tool : null;
};

// Lecture : exécutée aussitôt.
const read = async (tool, input, user, session) => {
  const data = await call(tool.request(input, user), session);
  return tool.view ? tool.view(data, input) : data;
};

// Écriture : rien n'est fait. L'action est décrite, signée pour ce compte et ce délai, et renvoyée à la fenêtre,
// où la personne la confirme. La signature empêche de la modifier ou de la rejouer avec un autre compte.
const prepare = async (tool, input, user, session) => {
  const prepared = tool.prepare ? await tool.prepare(input, (path) => call({ method: 'GET', path }, session)) : undefined;
  const request = tool.request(input, user, prepared);
  if (!WRITE_METHODS.includes(request.method)) throw new AppError(403, 'ASSISTANT_FORBIDDEN', 'L’assistant ne supprime rien.');
  const summary = tool.summary(input);
  const token = jwt.sign({ tool: tool.name, input, request }, env.auth.secret, { subject: String(user.id), audience: AUDIENCE, expiresIn: ACTION_TTL, jwtid: crypto.randomUUID() });
  return { token, summary };
};

// Confirmation par la personne : l'action signée est vérifiée, puis envoyée à l'API avec sa session.
const confirm = async (user, token, session) => {
  let action;
  try {
    action = jwt.verify(token, env.auth.secret, { audience: AUDIENCE, subject: String(user.id) });
  } catch (error) {
    throw new AppError(400, 'ASSISTANT_ACTION_EXPIRED', 'Cette action a expiré. Redemandez-la à l’assistant.');
  }
  const tool = allowedTool(user, action.tool);
  if (!tool || !tool.write) throw new AppError(403, 'FORBIDDEN', 'Vous n’avez pas accès à cette action.');
  if (!markUsed(action.jti, action.exp * 1000)) throw new AppError(409, 'ASSISTANT_ACTION_DONE', 'Cette action a déjà été confirmée.');
  const { request, input } = action;
  // Un mot de passe temporaire est tiré maintenant, et montré à la seule personne qui confirme.
  const secret = tool.secret ? tool.secret(request.body || {}, input) : null;
  const data = await call({ ...request, body: secret ? secret.body : request.body }, session);
  const message = tool.done(data, input);
  return { message, reveal: secret?.reveal || null };
};

module.exports = { call, allowedTool, read, prepare, confirm };
