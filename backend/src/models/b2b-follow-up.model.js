// Relance d'une rencontre B2B : un rappel à l'équipe du stand, à une date et heure, avec son motif (souvent la prochaine
// étape convenue au compte rendu). Elle reste « à faire » jusqu'à « Marquer faite » : terminée, relancer ou autre.
const B2B_FOLLOW_UP_OUTCOMES = ['closed', 'again', 'other'];

module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'B2bFollowUp',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      b2bProposalId: { type: DataTypes.UUID, allowNull: false, field: 'b2b_proposal_id' },
      dueAt: { type: DataTypes.DATE, allowNull: false, field: 'due_at' },
      reason: { type: DataTypes.STRING(255), allowNull: false },
      autoSource: { type: DataTypes.STRING(12), allowNull: true, field: 'auto_source' },
      doneAt: { type: DataTypes.DATE, allowNull: true, field: 'done_at' },
      outcome: { type: DataTypes.STRING(12), allowNull: true, validate: { isIn: [B2B_FOLLOW_UP_OUTCOMES] } },
      outcomeNote: { type: DataTypes.STRING(500), allowNull: true, field: 'outcome_note' },
      createdByUserId: { type: DataTypes.UUID, allowNull: true, field: 'created_by_user_id' },
    },
    { tableName: 'b2b_follow_ups', underscored: true },
  );
