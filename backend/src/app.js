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
const followUpRoutes = require('./modules/follow-up/follow-up.route');
const investorRequestRoutes = require('./modules/investor-request/investor-request.route');
const b2bNeedRoutes = require('./modules/b2b-need/b2b-need.route');
const b2bProposalRoutes = require('./modules/b2b-proposal/b2b-proposal.route');
const studioInvitationRoutes = require('./modules/studio-invitation/studio-invitation.route');
const challengePassportRoutes = require('./modules/challenge-passport/challenge-passport.route');
const challengePassageRoutes = require('./modules/challenge-passage/challenge-passage.route');
const pushSubscriptionRoutes = require('./modules/push-subscription/push-subscription.route');
const programEventRoutes = require('./modules/program-event/program-event.route');
const screenRoutes = require('./modules/screen/screen.route');
const wheelRoutes = require('./modules/wheel/wheel.route');
const realtimeRoutes = require('./modules/realtime/realtime.route');
const settingsRoutes = require('./modules/settings/settings.route');
const dashboardRoutes = require('./modules/dashboard/dashboard.route');
const liveQuestionRoutes = require('./modules/live-question/live-question.route');
const seoRoutes = require('./modules/seo/seo.route');
const httpLogger = require('./middlewares/http-logger.middleware');
const audit = require('./middlewares/audit.middleware');
const auditLogRoutes = require('./modules/audit-log/audit-log.route');
const whatsappRoutes = require('./modules/whatsapp/whatsapp.route');
const assistantRoutes = require('./modules/assistant/assistant.route');
const notFound = require('./middlewares/not-found.middleware');
const errorHandler = require('./middlewares/error.middleware');

const app = express();

app.disable('x-powered-by');
// Derrière Nginx : l'adresse du visiteur vient de X-Forwarded-For, posé par le proxy local uniquement.
// Sans ce réglage, tous les visiteurs auraient l'adresse de Nginx et partageraient les mêmes limites d'essais.
app.set('trust proxy', 'loopback');
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
// Le corps brut est gardé pour contrôler la signature des notifications WhatsApp de Meta.
app.use(express.json({ limit: '1mb', verify: (request, response, buffer) => { request.rawBody = buffer; } }));
// Journal des actions de l'espace équipe (modifications réussies des comptes connectés).
app.use(audit);
app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads')));

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/occupants', occupantRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/follow-ups', followUpRoutes);
app.use('/api/investor-requests', investorRequestRoutes);
app.use('/api/b2b-needs', b2bNeedRoutes);
app.use('/api/b2b-proposals', b2bProposalRoutes);
app.use('/api/studio-invitations', studioInvitationRoutes);
app.use('/api/challenge-passports', challengePassportRoutes);
app.use('/api/challenge-passages', challengePassageRoutes);
app.use('/api/push-subscriptions', pushSubscriptionRoutes);
app.use('/api/program-events', programEventRoutes);
app.use('/api/screen', screenRoutes);
app.use('/api/wheel', wheelRoutes);
app.use('/api/realtime', realtimeRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/live-questions', liveQuestionRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/assistant', assistantRoutes);

// Pages HTML et sitemap servis par Nginx via l'API ; l'en-tête CSP de Helmet ne s'applique pas au site.
app.use((request, response, next) => {
  if (!request.path.startsWith('/api/') && !request.path.startsWith('/uploads/')) response.removeHeader('Content-Security-Policy');
  next();
}, seoRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
