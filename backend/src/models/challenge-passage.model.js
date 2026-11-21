module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'ChallengePassage',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      passportId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'passport_id',
      },
      occupantId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'occupant_id',
      },
      validatedByUserId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'validated_by_user_id',
      },
    },
    {
      tableName: 'challenge_passages',
      underscored: true,
      indexes: [{ unique: true, fields: ['passport_id', 'occupant_id'] }],
    },
  );
