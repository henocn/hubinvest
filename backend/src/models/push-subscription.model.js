module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'PushSubscription',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'user_id',
      },
      endpoint: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true,
      },
      p256dh: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      auth: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
    },
    {
      tableName: 'push_subscriptions',
      underscored: true,
    },
  );
