const authService = require('./auth.service');
const auditLogService = require('../audit-log/audit-log.service');

const login = async (request, response) => {
  const result = await authService.login(request.body);
  auditLogService.recordLogin(result.user, request.ip);
  response.json({ data: result, message: 'Connexion réussie.' });
};

const forgotPassword = async (request, response) => {
  await authService.forgotPassword(request.body);
  response.json({
    data: null,
    message: 'Si cette adresse correspond à un compte, un code de réinitialisation a été envoyé.',
  });
};

const resetPassword = async (request, response) => {
  await authService.resetPassword(request.body);
  response.json({ data: null, message: 'Mot de passe modifié.' });
};

const refresh = (request, response) => {
  response.json({ data: authService.refresh(request.user) });
};

const me = (request, response) => {
  response.json({ data: request.user });
};

module.exports = { refresh, login, forgotPassword, resetPassword, me };
