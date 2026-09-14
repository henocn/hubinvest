const healthService = require('./health.service');

const application = (request, response) => {
  response.json({
    data: {
      status: 'up',
      service: 'hubinvest-backend',
      timestamp: new Date().toISOString(),
    },
  });
};

const database = async (request, response) => {
  try {
    await healthService.checkDatabase();
    response.json({ data: { status: 'up', database: 'postgres' } });
  } catch (error) {
    response.status(503).json({
      code: 'DATABASE_UNAVAILABLE',
      message: 'La base de données est indisponible.',
    });
  }
};

module.exports = { application, database };
