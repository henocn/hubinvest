module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'B2bNeed',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      occupantId: { type: DataTypes.UUID, allowNull: false, field: 'occupant_id' },
      createdByUserId: { type: DataTypes.UUID, allowNull: true, field: 'created_by_user_id' },
      title: { type: DataTypes.STRING(180), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: false },
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'open', validate: { isIn: [['open', 'closed']] } },
    },
    { tableName: 'b2b_needs', underscored: true },
  );
