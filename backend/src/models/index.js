const { DataTypes } = require('sequelize');
const sequelize = require('../database/sequelize');
const defineOccupant = require('./occupant.model');
const defineUser = require('./user.model');
const defineContact = require('./contact.model');
const defineContactFollowUp = require('./contact-follow-up.model');
const defineB2bFollowUp = require('./b2b-follow-up.model');
const defineInvestorRequest = require('./investor-request.model');
const defineInvestorFollowUp = require('./investor-follow-up.model');
const defineInvestorMeeting = require('./investor-meeting.model');
const defineB2bNeed = require('./b2b-need.model');
const defineB2bProposal = require('./b2b-proposal.model');
const defineB2bMeeting = require('./b2b-meeting.model');
const defineStudioInvitation = require('./studio-invitation.model');
const defineChallengePassport = require('./challenge-passport.model');
const defineChallengePassage = require('./challenge-passage.model');
const defineNotificationJob = require('./notification-job.model');
const definePushSubscription = require('./push-subscription.model');
const defineProgramEvent = require('./program-event.model');
const defineWheelSegment = require('./wheel-segment.model');
const defineWheelCode = require('./wheel-code.model');
const defineWheelPlay = require('./wheel-play.model');
const defineAppSetting = require('./app-setting.model');
const defineLiveQuestion = require('./live-question.model');
const defineAuditLog = require('./audit-log.model');

const Occupant = defineOccupant(sequelize, DataTypes);
const User = defineUser(sequelize, DataTypes);
const Contact = defineContact(sequelize, DataTypes);
const ContactFollowUp = defineContactFollowUp(sequelize, DataTypes);
const B2bFollowUp = defineB2bFollowUp(sequelize, DataTypes);
const InvestorRequest = defineInvestorRequest(sequelize, DataTypes);
const InvestorFollowUp = defineInvestorFollowUp(sequelize, DataTypes);
const InvestorMeeting = defineInvestorMeeting(sequelize, DataTypes);
const B2bNeed = defineB2bNeed(sequelize, DataTypes);
const B2bProposal = defineB2bProposal(sequelize, DataTypes);
const B2bMeeting = defineB2bMeeting(sequelize, DataTypes);
const StudioInvitation = defineStudioInvitation(sequelize, DataTypes);
const ChallengePassport = defineChallengePassport(sequelize, DataTypes);
const ChallengePassage = defineChallengePassage(sequelize, DataTypes);
const NotificationJob = defineNotificationJob(sequelize, DataTypes);
const PushSubscription = definePushSubscription(sequelize, DataTypes);
const ProgramEvent = defineProgramEvent(sequelize, DataTypes);
const WheelSegment = defineWheelSegment(sequelize, DataTypes);
const WheelCode = defineWheelCode(sequelize, DataTypes);
const WheelPlay = defineWheelPlay(sequelize, DataTypes);
const AppSetting = defineAppSetting(sequelize, DataTypes);
const LiveQuestion = defineLiveQuestion(sequelize, DataTypes);
const AuditLog = defineAuditLog(sequelize, DataTypes);

Occupant.hasMany(User, { foreignKey: 'occupantId', as: 'users' });
User.belongsTo(Occupant, { foreignKey: 'occupantId', as: 'occupant' });

Occupant.hasMany(Contact, { foreignKey: 'occupantId', as: 'contacts' });
Contact.belongsTo(Occupant, { foreignKey: 'occupantId', as: 'occupant' });

User.hasMany(Contact, { foreignKey: 'createdByUserId', as: 'createdContacts' });
Contact.belongsTo(User, { foreignKey: 'createdByUserId', as: 'createdBy' });
Contact.hasMany(ContactFollowUp, { foreignKey: 'contactId', as: 'followUps' });
ContactFollowUp.belongsTo(Contact, { foreignKey: 'contactId', as: 'contact' });
ContactFollowUp.belongsTo(User, { foreignKey: 'createdByUserId', as: 'createdBy' });


Occupant.hasMany(B2bNeed, { foreignKey: 'occupantId', as: 'b2bNeeds' });
B2bNeed.belongsTo(Occupant, { foreignKey: 'occupantId', as: 'occupant' });

User.hasMany(B2bNeed, { foreignKey: 'createdByUserId', as: 'createdB2bNeeds' });
B2bNeed.belongsTo(User, { foreignKey: 'createdByUserId', as: 'createdBy' });

B2bNeed.hasMany(B2bProposal, { foreignKey: 'b2bNeedId', as: 'proposals' });
B2bProposal.belongsTo(B2bNeed, { foreignKey: 'b2bNeedId', as: 'need' });

User.hasMany(B2bProposal, { foreignKey: 'handledByUserId', as: 'handledB2bProposals' });
B2bProposal.belongsTo(User, { foreignKey: 'handledByUserId', as: 'handledBy' });
InvestorRequest.belongsTo(User, { foreignKey: 'contactUserId', as: 'contactUser' });
InvestorRequest.hasMany(InvestorFollowUp, { foreignKey: 'investorRequestId', as: 'followUps' });
InvestorFollowUp.belongsTo(User, { foreignKey: 'createdByUserId', as: 'createdBy' });
InvestorFollowUp.belongsTo(InvestorRequest, { foreignKey: 'investorRequestId', as: 'request' });
InvestorRequest.hasMany(InvestorMeeting, { foreignKey: 'investorRequestId', as: 'meetings' });
InvestorMeeting.belongsTo(User, { foreignKey: 'createdByUserId', as: 'createdBy' });
B2bProposal.hasMany(B2bMeeting, { foreignKey: 'b2bProposalId', as: 'meetings' });
B2bMeeting.belongsTo(B2bProposal, { foreignKey: 'b2bProposalId', as: 'proposal' });
B2bProposal.hasMany(B2bFollowUp, { foreignKey: 'b2bProposalId', as: 'followUps' });
B2bFollowUp.belongsTo(B2bProposal, { foreignKey: 'b2bProposalId', as: 'proposal' });
B2bFollowUp.belongsTo(User, { foreignKey: 'createdByUserId', as: 'createdBy' });
B2bMeeting.belongsTo(User, { foreignKey: 'reportedByUserId', as: 'reportedBy' });

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

User.hasMany(WheelCode, { foreignKey: 'createdByUserId', as: 'createdWheelCodes' });
WheelCode.belongsTo(User, { foreignKey: 'createdByUserId', as: 'createdBy' });
WheelCode.hasMany(WheelPlay, { foreignKey: 'wheelCodeId', as: 'plays' });
WheelPlay.belongsTo(WheelCode, { foreignKey: 'wheelCodeId', as: 'wheelCode' });
WheelSegment.hasMany(WheelPlay, { foreignKey: 'segmentId', as: 'plays' });
WheelPlay.belongsTo(WheelSegment, { foreignKey: 'segmentId', as: 'segment' });
ChallengePassport.hasMany(WheelPlay, { foreignKey: 'passportId', as: 'wheelPlays' });
WheelPlay.belongsTo(ChallengePassport, { foreignKey: 'passportId', as: 'player' });
WheelPlay.belongsTo(User, { foreignKey: 'claimedByUserId', as: 'claimedBy' });

ProgramEvent.hasMany(LiveQuestion, { foreignKey: 'programEventId', as: 'questions' });
LiveQuestion.belongsTo(ProgramEvent, { foreignKey: 'programEventId', as: 'event' });
LiveQuestion.belongsTo(User, { foreignKey: 'handledByUserId', as: 'handledBy' });

module.exports = {
  sequelize,
  Occupant,
  User,
  Contact,
  ContactFollowUp,
  B2bFollowUp,
  InvestorRequest,
  InvestorFollowUp,
  InvestorMeeting,
  B2bNeed,
  B2bProposal,
  B2bMeeting,
  StudioInvitation,
  ChallengePassport,
  ChallengePassage,
  NotificationJob,
  PushSubscription,
  ProgramEvent,
  WheelSegment,
  WheelCode,
  WheelPlay,
  AppSetting,
  LiveQuestion,
  AuditLog,
};
