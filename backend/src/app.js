const express = require('express');
const path = require('node:path');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const healthRoutes = require('./modules/health/health.route');
const authRoutes = require('./modules/auth/auth.route');
const occupantRoutes = require('./modules/occupant/occupant.route');
const userRoutes = require('./modules/user/user.route');
const contactRoutes = require('./modules/contact/contact.route');
const investorRequestRoutes = require('./modules/investor-request/investor-request.route');
const b2bNeedRoutes = require('./modules/b2b-need/b2b-need.route');
const b2bProposalRoutes = require('./modules/b2b-proposal/b2b-proposal.route');
const studioInvitationRoutes = require('./modules/studio-invitation/studio-invitation.route');
const challengePassportRoutes = require('./modules/challenge-passport/challenge-passport.route');
const challengePassageRoutes = require('./modules/challenge-passage/challenge-passage.route');
const pushSubscriptionRoutes = require('./modules/push-subscription/push-subscription.route');
const programEventRoutes = require('./modules/program-event/program-event.route');
const httpLogger = require('./middlewares/http-logger.middleware');
const notFound = require('./middlewares/not-found.middleware');
const errorHandler = require('./middlewares/error.middleware');

const app = express();

app.disable('x-powered-by');
app.use(httpLogger);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
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
app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads')));

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/occupants', occupantRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/investor-requests', investorRequestRoutes);
app.use('/api/b2b-needs', b2bNeedRoutes);
app.use('/api/b2b-proposals', b2bProposalRoutes);
app.use('/api/studio-invitations', studioInvitationRoutes);
app.use('/api/challenge-passports', challengePassportRoutes);
app.use('/api/challenge-passages', challengePassageRoutes);
app.use('/api/push-subscriptions', pushSubscriptionRoutes);
app.use('/api/program-events', programEventRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
