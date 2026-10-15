const PROGRAM_EVENT_TYPES = ['spotlight', 'highlight', 'animation', 'studio', 'talk'];

module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'ProgramEvent',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      occupantId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'occupant_id',
      },
      type: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: { isIn: [PROGRAM_EVENT_TYPES] },
      },
      title: {
        type: DataTypes.STRING(180),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      location: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      startsAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'starts_at',
      },
      endsAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'ends_at',
      },
    },
    {
      tableName: 'program_events',
      underscored: true,
    },
  );

module.exports.PROGRAM_EVENT_TYPES = PROGRAM_EVENT_TYPES;
