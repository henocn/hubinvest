'use strict';

// Relances des rencontres B2B, sur le modèle des relances des contacts et des guichets : date et heure, motif, à faire
// jusqu'à « Marquer faite ». La prochaine étape d'un compte rendu, avec une date, crée la sienne.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('b2b_follow_ups', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true },
      b2b_proposal_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'b2b_proposals', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      due_at: { type: Sequelize.DATE, allowNull: false },
      reason: { type: Sequelize.STRING(255), allowNull: false },
      auto_source: { type: Sequelize.STRING(12), allowNull: true },
      done_at: { type: Sequelize.DATE, allowNull: true },
      outcome: { type: Sequelize.STRING(12), allowNull: true },
      outcome_note: { type: Sequelize.STRING(500), allowNull: true },
      created_by_user_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('b2b_follow_ups', ['b2b_proposal_id']);
    await queryInterface.addIndex('b2b_follow_ups', ['done_at', 'due_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('b2b_follow_ups');
  },
};
