module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'InvestorRequest',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      assignedToUserId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'assigned_to_user_id',
      },
      occupantId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'occupant_id',
      },
      fullName: {
        type: DataTypes.STRING(160),
        allowNull: false,
        field: 'full_name',
      },
      email: {
        type: DataTypes.STRING(180),
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING(32),
        allowNull: true,
      },
      projectSummary: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'project_summary',
      },
      status: {
        type: DataTypes.STRING(24),
        allowNull: false,
        defaultValue: 'new',
        validate: { isIn: [['new', 'in_progress', 'closed']] },
      },
      nextAction: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'next_action',
      },
      consentApizf: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        field: 'consent_apizf',
      },
      consentCapturedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'consent_captured_at',
      },
    },
    {
      tableName: 'investor_requests',
      underscored: true,
    },
  );
