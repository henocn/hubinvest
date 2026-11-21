const WHEEL_SEGMENT_KINDS = ['prize', 'lose'];

module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'WheelSegment',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      kind: {
        type: DataTypes.STRING(10),
        allowNull: false,
        validate: { isIn: [WHEEL_SEGMENT_KINDS] },
      },
      label: {
        type: DataTypes.STRING(60),
        allowNull: false,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      awarded: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_active',
      },
      position: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      tableName: 'wheel_segments',
      underscored: true,
    },
  );

module.exports.WHEEL_SEGMENT_KINDS = WHEEL_SEGMENT_KINDS;
