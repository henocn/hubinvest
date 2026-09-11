const { ValidationError, UniqueConstraintError, ForeignKeyConstraintError } = require('sequelize');

module.exports = (error, request, response, next) => {
  if (response.headersSent) {
    return next(error);
  }

  if (error instanceof UniqueConstraintError) {
    return response.status(409).json({
      code: 'RESOURCE_CONFLICT',
      message: 'Cette valeur est deja utilisee.',
    });
  }

  if (error instanceof ForeignKeyConstraintError) {
    return response.status(409).json({
      code: 'RESOURCE_IN_USE',
      message: 'Cette ressource est encore utilisee.',
    });
  }

  if (error instanceof ValidationError) {
    return response.status(422).json({
      code: 'DATABASE_VALIDATION_ERROR',
      message: 'Les donnees ne sont pas valides.',
    });
  }

  const status = error.status || 500;
  const payload = {
    code: error.code || 'INTERNAL_ERROR',
    message: status === 500 ? 'Une erreur interne est survenue.' : error.message,
  };

  if (error.details) {
    payload.details = error.details;
  }

  if (status === 500 && process.env.NODE_ENV !== 'test') {
    console.error(error);
  }

  return response.status(status).json(payload);
};
