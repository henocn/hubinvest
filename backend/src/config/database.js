require('./env');

const base = {
  username: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hubinvest',
  host: process.env.DB_HOST || 'localhost',
  port: Number.parseInt(process.env.DB_PORT || '5432', 10),
  dialect: process.env.DB_DIALECT || 'postgres',
  logging: false,
  define: {
    underscored: true,
  },
};

module.exports = {
  development: base,
  test: {
    ...base,
    database: process.env.DB_TEST_NAME || `${base.database}_test`,
  },
  production: {
    ...base,
    logging: false,
    dialectOptions:
      process.env.DB_SSL === 'true'
        ? {
            ssl: {
              require: true,
              rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
            },
          }
        : undefined,
  },
};
