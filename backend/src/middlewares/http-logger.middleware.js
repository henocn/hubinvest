const env = require('../config/env');

module.exports = (request, response, next) => {
  if (env.nodeEnv === 'test') {
    return next();
  }

  const startedAt = process.hrtime.bigint();

  response.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    console.log(
      `[HTTP] ${request.method} ${request.originalUrl} ${response.statusCode} ${duration.toFixed(1)} ms`,
    );
  });

  return next();
};
