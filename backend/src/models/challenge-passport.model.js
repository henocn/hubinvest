module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'ChallengePassport',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      redeemedByUserId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'redeemed_by_user_id',
      },
      token: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
      },
      code: {
        type: DataTypes.STRING(8),
        allowNull: false,
        unique: true,
      },
      displayName: {
        type: DataTypes.STRING(120),
        allowNull: false,
        field: 'display_name',
      },
      status: {
        type: DataTypes.STRING(24),
        allowNull: false,
        defaultValue: 'active',
        validate: { isIn: [['active', 'completed', 'redeemed']] },
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'completed_at',
      },
      redeemedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'redeemed_at',
      },
    },
    {
      tableName: 'challenge_passports',
      underscored: true,
    },
  );
