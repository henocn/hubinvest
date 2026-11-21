'use strict';

// Investor Desk (document, module M3) : qualification en neuf informations, classe A·B·C, interlocuteur nommé,
// date de la prochaine relance (A sous 48 h, B sous 7 jours), journal des relances et rendez-vous.
const userReference = (Sequelize) => ({
  type: Sequelize.UUID,
  allowNull: true,
  references: { model: 'users', key: 'id' },
  onUpdate: 'CASCADE',
  onDelete: 'SET NULL',
});
const requestReference = (Sequelize) => ({
  type: Sequelize.UUID,
  allowNull: false,
  references: { model: 'investor_requests', key: 'id' },
  onUpdate: 'CASCADE',
  onDelete: 'CASCADE',
});

module.exports = {
  async up(queryInterface, Sequelize) {
    const timestamps = {
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    };
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn('investor_requests', 'classification', { type: Sequelize.STRING(1), allowNull: true }, { transaction });
      await queryInterface.addColumn('investor_requests', 'qualification', { type: Sequelize.JSONB, allowNull: true }, { transaction });
      await queryInterface.addColumn('investor_requests', 'contact_user_id', userReference(Sequelize), { transaction });
      await queryInterface.addColumn('investor_requests', 'next_follow_up_at', { type: Sequelize.DATE, allowNull: true }, { transaction });
      await queryInterface.addIndex('investor_requests', ['next_follow_up_at'], { transaction });

      await queryInterface.createTable('investor_follow_ups', {
        id: { type: Sequelize.UUID, allowNull: false, primaryKey: true },
        investor_request_id: requestReference(Sequelize),
        done_at: { type: Sequelize.DATE, allowNull: false },
        channel: { type: Sequelize.STRING(20), allowNull: false },
        note: { type: Sequelize.TEXT, allowNull: true },
        next_step: { type: Sequelize.STRING(255), allowNull: true },
        created_by_user_id: userReference(Sequelize),
        ...timestamps,
      }, { transaction });
      await queryInterface.addIndex('investor_follow_ups', ['investor_request_id'], { transaction });

      await queryInterface.createTable('investor_meetings', {
        id: { type: Sequelize.UUID, allowNull: false, primaryKey: true },
        investor_request_id: requestReference(Sequelize),
        starts_at: { type: Sequelize.DATE, allowNull: false },
        location: { type: Sequelize.STRING(160), allowNull: false },
        created_by_user_id: userReference(Sequelize),
        ...timestamps,
      }, { transaction });
      await queryInterface.addIndex('investor_meetings', ['investor_request_id'], { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable('investor_meetings', { transaction });
      await queryInterface.dropTable('investor_follow_ups', { transaction });
      await queryInterface.removeIndex('investor_requests', ['next_follow_up_at'], { transaction });
      await queryInterface.removeColumn('investor_requests', 'next_follow_up_at', { transaction });
      await queryInterface.removeColumn('investor_requests', 'contact_user_id', { transaction });
      await queryInterface.removeColumn('investor_requests', 'qualification', { transaction });
      await queryInterface.removeColumn('investor_requests', 'classification', { transaction });
    });
  },
};
