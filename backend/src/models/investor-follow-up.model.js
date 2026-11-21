// Une relance faite par l'API-ZF auprès d'un investisseur : quand, par appel ou par message, ce qui s'est dit et l'étape suivante.
const INVESTOR_FOLLOW_UP_CHANNELS = ['call', 'message'];

module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'InvestorFollowUp',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      investorRequestId: { type: DataTypes.UUID, allowNull: false, field: 'investor_request_id' },
      doneAt: { type: DataTypes.DATE, allowNull: false, field: 'done_at' },
      channel: { type: DataTypes.STRING(20), allowNull: false, validate: { isIn: [INVESTOR_FOLLOW_UP_CHANNELS] } },
      note: { type: DataTypes.TEXT, allowNull: true },
      nextStep: { type: DataTypes.STRING(255), allowNull: true, field: 'next_step' },
      createdByUserId: { type: DataTypes.UUID, allowNull: true, field: 'created_by_user_id' },
    },
    { tableName: 'investor_follow_ups', underscored: true },
  );

module.exports.INVESTOR_FOLLOW_UP_CHANNELS = INVESTOR_FOLLOW_UP_CHANNELS;
