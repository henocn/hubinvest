const auditLogService = require('../modules/audit-log/audit-log.service');

// Journal des actions : une fois la réponse envoyée, chaque modification réussie d'un compte connecté est inscrite.
// La réponse JSON est seulement lue pour nommer l'élément concerné ; rien du contenu saisi n'est gardé.
const audit = (request, response, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return next();
  let data = null;
  const json = response.json.bind(response);
  response.json = (body) => {
    data = body?.data ?? null;
    return json(body);
  };
  response.on('finish', () => {
    if (response.statusCode >= 400 || !request.user) return;
    auditLogService.recordRequest({ user: request.user, method: request.method, path: request.originalUrl, ip: request.ip, data });
  });
  return next();
};

module.exports = audit;
