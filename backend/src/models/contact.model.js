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
        allowNull: false,
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
        allowNull: false,
        defaultValue: 'cold',
        validate: { isIn: [['hot', 'warm', 'cold']] },
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
    },
    {
      tableName: 'contacts',
      underscored: true,
    },
  );
