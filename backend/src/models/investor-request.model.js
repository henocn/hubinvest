const { GUICHET_KEYS, CONTACT_SOURCES, CLASSIFICATIONS } = require('../shared/guichets');

// Registre unique des contacts des guichets (document v4, M3).
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
      // Vide pour un rendez-vous réservé en ligne : le guichet choisi dit de quoi il s'agit.
      projectSummary: {
        type: DataTypes.TEXT,
        allowNull: true,
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
      // Classe du document : A = projet prioritaire (relance sous 48 h), B = à suivre (sous 7 jours), C = à nourrir (newsletter),
      // support = Accompagnement (entreprise installée qui signale une difficulté : engagement de suivi écrit).
      classification: {
        type: DataTypes.STRING(12),
        allowNull: true,
        validate: { isIn: [CLASSIFICATIONS] },
      },
      // Guichet du Stand API-ZF : project, regime ou company.
      guichet: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'project', validate: { isIn: [GUICHET_KEYS] } },
      // Rendez-vous réservé en ligne, demande de rappel ou passage au guichet.
      source: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'callback', validate: { isIn: [CONTACT_SOURCES] } },
      organization: { type: DataTypes.STRING(160), allowNull: true },
      // Fiche de diagnostic (15 minutes) : le service vers lequel la personne est orientée, et quand le diagnostic a été fait.
      recommendedService: { type: DataTypes.STRING(40), allowNull: true, field: 'recommended_service' },
      diagnosedAt: { type: DataTypes.DATE, allowNull: true, field: 'diagnosed_at' },
      // Fiche « Mon entreprise, mes difficultés » : entreprise, régime, nature et description de la difficulté.
      difficulty: { type: DataTypes.JSONB, allowNull: true },
      // Engagement de suivi écrit : service concerné, délai de réponse, texte de l'engagement, réponse apportée.
      commitmentService: { type: DataTypes.STRING(40), allowNull: true, field: 'commitment_service' },
      commitmentDueAt: { type: DataTypes.DATE, allowNull: true, field: 'commitment_due_at' },
      commitmentNote: { type: DataTypes.TEXT, allowNull: true, field: 'commitment_note' },
      resolvedAt: { type: DataTypes.DATE, allowNull: true, field: 'resolved_at' },
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
