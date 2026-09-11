const AppError = require('../shared/app-error');

module.exports = (request, response, next) => {
  next(new AppError(404, 'ROUTE_NOT_FOUND', 'Route introuvable.'));
};
