module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'Contact',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      occupantId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'occupant_id',
      },
      createdByUserId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'created_by_user_id',
      },
      fullName: {
        type: DataTypes.STRING(160),
        allowNull: false,
        field: 'full_name',
      },
      phone: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      // Renseigné par le visiteur dans « Prendre contact » (les contacts saisis sur le stand n'en ont pas).
      email: {
        type: DataTypes.STRING(180),
        allowNull: true,
      },
      company: {
        type: DataTypes.STRING(160),
        allowNull: true,
      },
      need: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      qualification: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: 'C',
        // A = prioritaire (recontacter sous 48 h), B = à suivre (sous 7 jours), C = à nourrir.
        validate: { isIn: [['A', 'B', 'C']] },
      },
      nextAction: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'next_action',
      },
      nextActionAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'next_action_at',
      },
      consentOccupant: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'consent_occupant',
      },
      consentApizf: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'consent_apizf',
      },
      source: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'stand',
        validate: { isIn: [['stand', 'public']] },
      },
      consentCapturedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'consent_captured_at',
      },
    },
    {
      tableName: 'contacts',
      underscored: true,
    },
  );
