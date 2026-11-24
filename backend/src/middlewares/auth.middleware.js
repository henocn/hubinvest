const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../shared/app-error');
const { User, Occupant } = require('../models');

// Retrouve un compte actif dont l'occupant, s'il en a un, est lui aussi actif.
const findSessionUser = async (userId) => {
  const user = await User.findOne({
    where: { id: userId, isActive: true },
    attributes: ['id', 'occupantId', 'email', 'firstName', 'lastName', 'role'],
    include: [{ model: Occupant, as: 'occupant', attributes: ['status', 'space'], required: false }],
  });

  if (!user) {
    throw new AppError(401, 'INVALID_TOKEN', 'Session invalide ou expirée.');
  }

  if (user.occupantId && user.occupant?.status !== 'active') {
    // 401 : la session n'est plus valable (le 403 reste réservé aux actions non permises, sans déconnexion).
    throw new AppError(401, 'OCCUPANT_INACTIVE', "Le compte de l’occupant est inactif.");
  }

  return user.toJSON();
};

const authenticate = async (request, response, next) => {
  const authorization = request.headers.authorization || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new AppError(401, 'AUTH_REQUIRED', 'Authentification requise.'));
  }

  if (!env.auth.secret) {
    return next(new AppError(500, 'AUTH_NOT_CONFIGURED', "L’authentification n’est pas configurée."));
  }

  let payload;
  try {
    payload = jwt.verify(token, env.auth.secret);
  } catch (error) {
    return next(new AppError(401, 'INVALID_TOKEN', 'Session invalide ou expirée.'));
  }

  try {
    request.user = await findSessionUser(payload.sub);
  } catch (error) {
    return next(error);
  }
  request.tokenExpiresAt = payload.exp ? payload.exp * 1000 : null;
  return next();
};

const requireRoles = (...allowedRoles) => (request, response, next) => {
  if (!request.user || !allowedRoles.includes(request.user.role)) {
    return next(new AppError(403, 'FORBIDDEN', "Vous n’avez pas accès à cette action."));
  }

  return next();
};

module.exports = { authenticate, requireRoles, findSessionUser };
