module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'AppSetting',
    {
      key: {
        type: DataTypes.STRING(60),
        primaryKey: true,
      },
      value: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      updatedByUserId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'updated_by_user_id',
      },
    },
    {
      tableName: 'app_settings',
      underscored: true,
    },
  );
