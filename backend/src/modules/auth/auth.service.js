const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const AppError = require('../../shared/app-error');
const authRepository = require('./auth.repository');

const login = async ({ email, password }) => {
  if (!env.auth.secret) {
    throw new AppError(500, 'AUTH_NOT_CONFIGURED', "L’authentification n’est pas configurée.");
  }

  const user = await authRepository.findUserByEmail(email.toLowerCase());
  const validPassword = user && (await bcrypt.compare(password, user.passwordHash));

  if (!validPassword || !user.isActive) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Identifiants incorrects.');
  }

  if (user.occupantId && user.occupant?.status !== 'active') {
    throw new AppError(403, 'OCCUPANT_INACTIVE', "Le compte de l’occupant est inactif.");
  }

  const token = jwt.sign(
    { role: user.role, occupantId: user.occupantId },
    env.auth.secret,
    { subject: user.id, expiresIn: env.auth.expiresIn },
  );

  const payload = user.toJSON();
  delete payload.passwordHash;

  return { token, user: payload };
};

module.exports = { login };
