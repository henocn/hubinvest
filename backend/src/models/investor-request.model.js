module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'InvestorRequest',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
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
      // Classe du document : A = projet prioritaire (relance sous 48 h), B = à suivre (sous 7 jours), C = à nourrir (newsletter).
      classification: {
        type: DataTypes.STRING(1),
        allowNull: true,
        validate: { isIn: [['A', 'B', 'C']] },
      },
      // Réponses aux informations de qualification réglées dans Paramètres, par clé de champ.
      qualification: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      // Interlocuteur nommé de l'API-ZF qui relance l'investisseur.
      contactUserId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'contact_user_id',
      },
      nextFollowUpAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'next_follow_up_at',
      },
      language: {
        type: DataTypes.STRING(2),
        allowNull: false,
        defaultValue: 'fr',
        validate: { isIn: [['fr', 'en']] },
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
