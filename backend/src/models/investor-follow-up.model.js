// Relance d'un contact des guichets : un rappel au gestionnaire, à une date et heure, avec son motif. Elle reste « à faire »
// tant qu'on ne l'a pas marquée faite ; on note alors la prochaine étape : terminée, relancer (une nouvelle relance est
// créée) ou autre (un texte). Une classe A ou B crée sa relance automatique (autoClass).
const INVESTOR_FOLLOW_UP_OUTCOMES = ['closed', 'again', 'other'];

module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'InvestorFollowUp',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      investorRequestId: { type: DataTypes.UUID, allowNull: false, field: 'investor_request_id' },
      dueAt: { type: DataTypes.DATE, allowNull: false, field: 'due_at' },
      reason: { type: DataTypes.STRING(255), allowNull: false },
      autoClass: { type: DataTypes.STRING(1), allowNull: true, field: 'auto_class' },
      doneAt: { type: DataTypes.DATE, allowNull: true, field: 'done_at' },
      outcome: { type: DataTypes.STRING(12), allowNull: true, validate: { isIn: [INVESTOR_FOLLOW_UP_OUTCOMES] } },
      outcomeNote: { type: DataTypes.STRING(500), allowNull: true, field: 'outcome_note' },
      createdByUserId: { type: DataTypes.UUID, allowNull: true, field: 'created_by_user_id' },
    },
    { tableName: 'investor_follow_ups', underscored: true },
  );

module.exports.INVESTOR_FOLLOW_UP_OUTCOMES = INVESTOR_FOLLOW_UP_OUTCOMES;
