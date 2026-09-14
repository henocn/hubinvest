const authService = require('./auth.service');

const login = async (request, response) => {
  const result = await authService.login(request.body);
  response.json({ data: result, message: 'Connexion réussie.' });
};

const me = (request, response) => {
  response.json({ data: request.user });
};

module.exports = { login, me };
