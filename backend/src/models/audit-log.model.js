// Une ligne du journal des actions : le compte (nom et rôle copiés), la rubrique, l'action, l'élément concerné.
module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'AuditLog',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: true, field: 'user_id' },
      userName: { type: DataTypes.STRING(160), allowNull: false, field: 'user_name' },
      userRole: { type: DataTypes.STRING(20), allowNull: false, field: 'user_role' },
      section: { type: DataTypes.STRING(40), allowNull: false },
      action: { type: DataTypes.STRING(120), allowNull: false },
      target: { type: DataTypes.STRING(200), allowNull: true },
      method: { type: DataTypes.STRING(8), allowNull: false },
      path: { type: DataTypes.STRING(255), allowNull: false },
      ip: { type: DataTypes.STRING(64), allowNull: true },
    },
    { tableName: 'audit_logs', underscored: true, updatedAt: false },
  );
