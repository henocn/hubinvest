const roles = require('../shared/roles');

module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'User',
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
      firstName: {
        type: DataTypes.STRING(80),
        allowNull: false,
        field: 'first_name',
      },
      lastName: {
        type: DataTypes.STRING(80),
        allowNull: false,
        field: 'last_name',
      },
      email: {
        type: DataTypes.STRING(180),
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      phone: {
        type: DataTypes.STRING(32),
        allowNull: true,
      },
      passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'password_hash',
      },
      role: {
        type: DataTypes.STRING(40),
        allowNull: false,
        validate: { isIn: [Object.values(roles)] },
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_active',
      },
    },
    {
      tableName: 'users',
      underscored: true,
      defaultScope: {
        attributes: { exclude: ['passwordHash'] },
      },
      scopes: {
        withPassword: { attributes: { include: ['passwordHash'] } },
      },
    },
  );
