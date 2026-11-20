const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const AppError = require('../../shared/app-error');
const authRepository = require('./auth.repository');
const authMailer = require('./auth.mailer');

const hashResetCode = (email, code) => crypto
  .createHmac('sha256', env.auth.secret)
  .update(`${email}:${code}`)
  .digest('hex');

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

  // La connexion compte comme une présence, même avant l'ouverture du flux temps réel.
  await user.update({ lastSeenAt: new Date() });
  const payload = user.toJSON();
  delete payload.passwordHash;

  return { token, user: payload };
};

const forgotPassword = async ({ email }) => {
  if (!env.auth.secret) {
    throw new AppError(500, 'AUTH_NOT_CONFIGURED', 'L’authentification n’est pas configurée.');
  }
  if (!authMailer.isConfigured()) {
    throw new AppError(503, 'EMAIL_NOT_CONFIGURED', 'L’envoi d’e-mails n’est pas configuré.');
  }

  const normalizedEmail = email.toLowerCase();
  const user = await authRepository.findUserByEmail(normalizedEmail);
  if (!user || !user.isActive || (user.occupantId && user.occupant?.status !== 'active')) return;

  const code = crypto.randomInt(0, 100000).toString().padStart(5, '0');
  await authRepository.savePasswordReset(
    user,
    hashResetCode(normalizedEmail, code),
    new Date(Date.now() + env.auth.passwordResetExpiresIn),
  );

  Promise.resolve()
    .then(() => authMailer.sendPasswordReset(user, code))
    .catch(async (error) => {
      if (env.nodeEnv !== 'test') console.error('Échec de l’envoi du code de réinitialisation.', error.message);
      await authRepository.clearPasswordReset(user).catch(() => {});
    });
};

const resetPassword = async ({ email, code, password }) => {
  if (!env.auth.secret) {
    throw new AppError(500, 'AUTH_NOT_CONFIGURED', 'L’authentification n’est pas configurée.');
  }
  const normalizedEmail = email.toLowerCase();
  const changed = await authRepository.resetPassword(
    normalizedEmail,
    hashResetCode(normalizedEmail, code),
    await bcrypt.hash(password, 12),
  );
  if (!changed) {
    await authRepository.recordFailedReset(normalizedEmail);
    throw new AppError(422, 'PASSWORD_RESET_INVALID', 'Ce code est invalide ou a expiré.');
  }
};

module.exports = { login, forgotPassword, resetPassword };
