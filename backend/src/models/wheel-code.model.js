module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'WheelCode',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      code: {
        type: DataTypes.STRING(12),
        allowNull: false,
        unique: true,
      },
      createdByUserId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'created_by_user_id',
      },
      passportId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'passport_id',
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'expires_at',
      },
      usedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'used_at',
      },
      segmentId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'segment_id',
      },
      resultKind: {
        type: DataTypes.STRING(10),
        allowNull: true,
        field: 'result_kind',
      },
      resultLabel: {
        type: DataTypes.STRING(60),
        allowNull: true,
        field: 'result_label',
      },
      resultSponsor: {
        type: DataTypes.STRING(120),
        allowNull: true,
        field: 'result_sponsor',
      },
      claimedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'claimed_at',
      },
      claimedByUserId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'claimed_by_user_id',
      },
    },
    {
      tableName: 'wheel_codes',
      underscored: true,
    },
  );
