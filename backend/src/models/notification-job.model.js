module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'NotificationJob',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      channel: {
        type: DataTypes.STRING(16),
        allowNull: false,
        validate: { isIn: [['email', 'user']] },
      },
      recipient: {
        type: DataTypes.STRING(180),
        allowNull: false,
      },
      payload: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      dedupeKey: {
        type: DataTypes.STRING(120),
        allowNull: true,
        field: 'dedupe_key',
      },
      status: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: 'pending',
        validate: { isIn: [['pending', 'processing', 'sent', 'failed', 'cancelled']] },
      },
      attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      availableAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'available_at',
      },
      lockedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'locked_at',
      },
      sentAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'sent_at',
      },
      lastError: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'last_error',
      },
    },
    {
      tableName: 'notification_jobs',
      underscored: true,
    },
  );
