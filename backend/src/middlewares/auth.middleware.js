const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../shared/app-error');
const { User } = require('../models');

const authenticate = async (request, response, next) => {
  const authorization = request.headers.authorization || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new AppError(401, 'AUTH_REQUIRED', 'Authentification requise.'));
  }

  if (!env.auth.secret) {
    return next(new AppError(500, 'AUTH_NOT_CONFIGURED', "L'authentification n'est pas configuree."));
  }

  let payload;
  try {
    payload = jwt.verify(token, env.auth.secret);
  } catch (error) {
    return next(new AppError(401, 'INVALID_TOKEN', 'Session invalide ou expiree.'));
  }

  const user = await User.findOne({
    where: { id: payload.sub, isActive: true },
    attributes: ['id', 'occupantId', 'email', 'firstName', 'lastName', 'role'],
  });

  if (!user) {
    return next(new AppError(401, 'INVALID_TOKEN', 'Session invalide ou expiree.'));
  }

  request.user = user.toJSON();
  return next();
};

const requireRoles = (...allowedRoles) => (request, response, next) => {
  if (!request.user || !allowedRoles.includes(request.user.role)) {
    return next(new AppError(403, 'FORBIDDEN', "Vous n'avez pas acces a cette action."));
  }

  return next();
};

module.exports = { authenticate, requireRoles };
