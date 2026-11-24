// Relance d'un contact de stand : un rappel à l'équipe du stand, à une date et heure, avec son motif. Elle reste « à faire »
// tant qu'on ne l'a pas marquée faite ; on note alors la prochaine étape : terminée, relancer (une nouvelle relance est
// créée) ou autre (un texte). Une classe A ou B crée sa relance automatique (autoSource : 'A' ou 'B').
const CONTACT_FOLLOW_UP_OUTCOMES = ['closed', 'again', 'other'];

module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'ContactFollowUp',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      contactId: { type: DataTypes.UUID, allowNull: false, field: 'contact_id' },
      dueAt: { type: DataTypes.DATE, allowNull: false, field: 'due_at' },
      reason: { type: DataTypes.STRING(255), allowNull: false },
      autoSource: { type: DataTypes.STRING(12), allowNull: true, field: 'auto_source' },
      doneAt: { type: DataTypes.DATE, allowNull: true, field: 'done_at' },
      outcome: { type: DataTypes.STRING(12), allowNull: true, validate: { isIn: [CONTACT_FOLLOW_UP_OUTCOMES] } },
      outcomeNote: { type: DataTypes.STRING(500), allowNull: true, field: 'outcome_note' },
      createdByUserId: { type: DataTypes.UUID, allowNull: true, field: 'created_by_user_id' },
    },
    { tableName: 'contact_follow_ups', underscored: true },
  );

module.exports.CONTACT_FOLLOW_UP_OUTCOMES = CONTACT_FOLLOW_UP_OUTCOMES;
