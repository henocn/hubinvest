// Un tour de roue joué avec un code : le joueur, la case tirée et, pour un lot, sa remise (une seule fois).
module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'WheelPlay',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      wheelCodeId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'wheel_code_id',
      },
      passportId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'passport_id',
      },
      segmentId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'segment_id',
      },
      resultKind: {
        type: DataTypes.STRING(10),
        allowNull: false,
        field: 'result_kind',
      },
      resultLabel: {
        type: DataTypes.STRING(60),
        allowNull: false,
        field: 'result_label',
      },
      playedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'played_at',
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
      tableName: 'wheel_plays',
      underscored: true,
    },
  );
