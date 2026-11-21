'use strict';

// Rencontre B2B : une demande acceptée reçoit un ou plusieurs rendez-vous (jour, heure, table),
// puis un compte rendu en un clic (tenue avec suite, tenue sans suite, absent) et une note facultative.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('b2b_meetings', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true },
      b2b_proposal_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'b2b_proposals', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      starts_at: { type: Sequelize.DATE, allowNull: false },
      duration_minutes: { type: Sequelize.INTEGER, allowNull: false },
      table_number: { type: Sequelize.INTEGER, allowNull: false },
      outcome: { type: Sequelize.STRING(20), allowNull: true },
      note: { type: Sequelize.TEXT, allowNull: true },
      reported_at: { type: Sequelize.DATE, allowNull: true },
      reported_by_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_by_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('b2b_meetings', ['b2b_proposal_id']);
    await queryInterface.addIndex('b2b_meetings', ['starts_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('b2b_meetings');
  },
};
