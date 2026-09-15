const AppError = require('../../shared/app-error');

const windowMs = 15 * 60 * 1000;

const createRateLimit = (maximumAttempts) => {
  const attempts = new Map();
  return (request, response, next) => {
    const now = Date.now();
    if (attempts.size > 1000) {
      attempts.forEach((attempt, attemptKey) => {
        if (attempt.expiresAt <= now) attempts.delete(attemptKey);
      });
    }
    const key = request.ip;
    const current = attempts.get(key);

    if (!current || current.expiresAt <= now) {
      attempts.set(key, { count: 1, expiresAt: now + windowMs });
      return next();
    }

    if (current.count >= maximumAttempts) {
      return next(new AppError(429, 'PASSWORD_RESET_RATE_LIMITED', 'Trop de demandes. Réessayez dans quelques minutes.'));
    }

    current.count += 1;
    return next();
  };
};

module.exports = {
  forgotPassword: createRateLimit(5),
  resetPassword: createRateLimit(10),
};
