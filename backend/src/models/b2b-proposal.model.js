module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'B2bProposal',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      b2bNeedId: { type: DataTypes.UUID, allowNull: false, field: 'b2b_need_id' },
      handledByUserId: { type: DataTypes.UUID, allowNull: true, field: 'handled_by_user_id' },
      fullName: { type: DataTypes.STRING(160), allowNull: false, field: 'full_name' },
      email: { type: DataTypes.STRING(180), allowNull: false },
      phone: { type: DataTypes.STRING(32), allowNull: true },
      message: { type: DataTypes.TEXT, allowNull: false },
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending', validate: { isIn: [['pending', 'accepted', 'declined']] } },
      language: { type: DataTypes.STRING(2), allowNull: false, defaultValue: 'fr', validate: { isIn: [['fr', 'en']] } },
      consentOccupant: { type: DataTypes.BOOLEAN, allowNull: false, field: 'consent_occupant' },
      consentCapturedAt: { type: DataTypes.DATE, allowNull: false, field: 'consent_captured_at' },
    },
    { tableName: 'b2b_proposals', underscored: true },
  );
