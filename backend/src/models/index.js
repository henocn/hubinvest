const { DataTypes } = require('sequelize');
const sequelize = require('../database/sequelize');
const defineOccupant = require('./occupant.model');
const defineUser = require('./user.model');
const defineContact = require('./contact.model');
const defineInvestorRequest = require('./investor-request.model');
const defineB2bNeed = require('./b2b-need.model');
const defineB2bProposal = require('./b2b-proposal.model');
const defineStudioInvitation = require('./studio-invitation.model');
const defineChallengePassport = require('./challenge-passport.model');
const defineChallengePassage = require('./challenge-passage.model');
const defineNotificationJob = require('./notification-job.model');
const definePushSubscription = require('./push-subscription.model');
const defineProgramEvent = require('./program-event.model');
const defineWheelSegment = require('./wheel-segment.model');
const defineWheelCode = require('./wheel-code.model');
const defineAppSetting = require('./app-setting.model');
const defineLiveQuestion = require('./live-question.model');

const Occupant = defineOccupant(sequelize, DataTypes);
const User = defineUser(sequelize, DataTypes);
const Contact = defineContact(sequelize, DataTypes);
const InvestorRequest = defineInvestorRequest(sequelize, DataTypes);
const B2bNeed = defineB2bNeed(sequelize, DataTypes);
const B2bProposal = defineB2bProposal(sequelize, DataTypes);
const StudioInvitation = defineStudioInvitation(sequelize, DataTypes);
const ChallengePassport = defineChallengePassport(sequelize, DataTypes);
const ChallengePassage = defineChallengePassage(sequelize, DataTypes);
const NotificationJob = defineNotificationJob(sequelize, DataTypes);
const PushSubscription = definePushSubscription(sequelize, DataTypes);
const ProgramEvent = defineProgramEvent(sequelize, DataTypes);
const WheelSegment = defineWheelSegment(sequelize, DataTypes);
const WheelCode = defineWheelCode(sequelize, DataTypes);
const AppSetting = defineAppSetting(sequelize, DataTypes);
const LiveQuestion = defineLiveQuestion(sequelize, DataTypes);

Occupant.hasMany(User, { foreignKey: 'occupantId', as: 'users' });
User.belongsTo(Occupant, { foreignKey: 'occupantId', as: 'occupant' });

Occupant.hasMany(Contact, { foreignKey: 'occupantId', as: 'contacts' });
Contact.belongsTo(Occupant, { foreignKey: 'occupantId', as: 'occupant' });

User.hasMany(Contact, { foreignKey: 'createdByUserId', as: 'createdContacts' });
Contact.belongsTo(User, { foreignKey: 'createdByUserId', as: 'createdBy' });


Occupant.hasMany(B2bNeed, { foreignKey: 'occupantId', as: 'b2bNeeds' });
B2bNeed.belongsTo(Occupant, { foreignKey: 'occupantId', as: 'occupant' });

User.hasMany(B2bNeed, { foreignKey: 'createdByUserId', as: 'createdB2bNeeds' });
B2bNeed.belongsTo(User, { foreignKey: 'createdByUserId', as: 'createdBy' });

B2bNeed.hasMany(B2bProposal, { foreignKey: 'b2bNeedId', as: 'proposals' });
B2bProposal.belongsTo(B2bNeed, { foreignKey: 'b2bNeedId', as: 'need' });

User.hasMany(B2bProposal, { foreignKey: 'handledByUserId', as: 'handledB2bProposals' });
B2bProposal.belongsTo(User, { foreignKey: 'handledByUserId', as: 'handledBy' });

User.hasMany(StudioInvitation, { foreignKey: 'createdByUserId', as: 'createdStudioInvitations' });
StudioInvitation.belongsTo(User, { foreignKey: 'createdByUserId', as: 'createdBy' });
Occupant.hasMany(StudioInvitation, { foreignKey: 'occupantId', as: 'studioInvitations' });
StudioInvitation.belongsTo(Occupant, { foreignKey: 'occupantId', as: 'occupant' });

ChallengePassport.hasMany(ChallengePassage, { foreignKey: 'passportId', as: 'passages' });
ChallengePassage.belongsTo(ChallengePassport, { foreignKey: 'passportId', as: 'passport' });

Occupant.hasMany(ChallengePassage, { foreignKey: 'occupantId', as: 'challengePassages' });
ChallengePassage.belongsTo(Occupant, { foreignKey: 'occupantId', as: 'occupant' });

User.hasMany(ChallengePassage, { foreignKey: 'validatedByUserId', as: 'validatedChallengePassages' });
ChallengePassage.belongsTo(User, { foreignKey: 'validatedByUserId', as: 'validatedBy' });

User.hasMany(ChallengePassport, { foreignKey: 'redeemedByUserId', as: 'redeemedChallengePassports' });
ChallengePassport.belongsTo(User, { foreignKey: 'redeemedByUserId', as: 'redeemedBy' });

User.hasMany(PushSubscription, { foreignKey: 'userId', as: 'pushSubscriptions' });
PushSubscription.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Occupant.hasMany(ProgramEvent, { foreignKey: 'occupantId', as: 'programEvents' });
ProgramEvent.belongsTo(Occupant, { foreignKey: 'occupantId', as: 'occupant' });

WheelSegment.hasMany(WheelCode, { foreignKey: 'segmentId', as: 'codes' });
WheelCode.belongsTo(WheelSegment, { foreignKey: 'segmentId', as: 'segment' });
User.hasMany(WheelCode, { foreignKey: 'createdByUserId', as: 'createdWheelCodes' });
WheelCode.belongsTo(User, { foreignKey: 'createdByUserId', as: 'createdBy' });
ChallengePassport.hasMany(WheelCode, { foreignKey: 'passportId', as: 'wheelCodes' });
WheelCode.belongsTo(ChallengePassport, { foreignKey: 'passportId', as: 'player' });
WheelCode.belongsTo(User, { foreignKey: 'claimedByUserId', as: 'claimedBy' });

ProgramEvent.hasMany(LiveQuestion, { foreignKey: 'programEventId', as: 'questions' });
LiveQuestion.belongsTo(ProgramEvent, { foreignKey: 'programEventId', as: 'event' });
LiveQuestion.belongsTo(User, { foreignKey: 'handledByUserId', as: 'handledBy' });

module.exports = {
  sequelize,
  Occupant,
  User,
  Contact,
  InvestorRequest,
  B2bNeed,
  B2bProposal,
  StudioInvitation,
  ChallengePassport,
  ChallengePassage,
  NotificationJob,
  PushSubscription,
  ProgramEvent,
  WheelSegment,
  WheelCode,
  AppSetting,
  LiveQuestion,
};
