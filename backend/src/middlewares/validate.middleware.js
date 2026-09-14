const AppError = require('../shared/app-error');

module.exports = (schema, property = 'body') => (request, response, next) => {
  const { error, value } = schema.validate(request[property], {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const details = error.details.map((item) => ({
      field: item.path.join('.'),
      message: item.message,
    }));

    return next(new AppError(422, 'VALIDATION_ERROR', 'Les données ne sont pas valides.', details));
  }

  request[property] = value;
  return next();
};
