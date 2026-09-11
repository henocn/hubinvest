const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const healthRoutes = require('./modules/health/health.route');
const authRoutes = require('./modules/auth/auth.route');
const occupantRoutes = require('./modules/occupant/occupant.route');
const userRoutes = require('./modules/user/user.route');
const contactRoutes = require('./modules/contact/contact.route');
const notFound = require('./middlewares/not-found.middleware');
const errorHandler = require('./middlewares/error.middleware');

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.corsOrigins.length === 0 || env.corsOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/occupants', occupantRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contacts', contactRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
