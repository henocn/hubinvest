const LIVE_QUESTION_STATUSES = ['new', 'asked', 'dismissed'];

module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'LiveQuestion',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      programEventId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'program_event_id',
      },
      authorName: {
        type: DataTypes.STRING(80),
        allowNull: true,
        field: 'author_name',
      },
      question: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'new',
        validate: { isIn: [LIVE_QUESTION_STATUSES] },
      },
      handledByUserId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'handled_by_user_id',
      },
      handledAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'handled_at',
      },
    },
    {
      tableName: 'live_questions',
      underscored: true,
    },
  );

module.exports.LIVE_QUESTION_STATUSES = LIVE_QUESTION_STATUSES;
