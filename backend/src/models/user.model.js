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
      passwordResetCodeHash: {
        type: DataTypes.STRING(64),
        allowNull: true,
        field: 'password_reset_code_hash',
      },
      passwordResetExpiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'password_reset_expires_at',
      },
      passwordResetAttempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'password_reset_attempts',
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
      // Dernière présence dans l'espace d'équipe (ouverture ou fermeture du flux temps réel, connexion).
      lastSeenAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'last_seen_at',
      },
    },
    {
      tableName: 'users',
      underscored: true,
      defaultScope: {
        attributes: { exclude: ['passwordHash', 'passwordResetCodeHash', 'passwordResetExpiresAt', 'passwordResetAttempts'] },
      },
      scopes: {
        withPassword: { attributes: { include: ['passwordHash'] } },
      },
    },
  );
