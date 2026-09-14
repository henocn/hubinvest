'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('b2b_proposals', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true },
      b2b_need_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'b2b_needs', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      handled_by_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      full_name: { type: Sequelize.STRING(160), allowNull: false },
      email: { type: Sequelize.STRING(180), allowNull: false },
      phone: { type: Sequelize.STRING(32), allowNull: true },
      message: { type: Sequelize.TEXT, allowNull: false },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'pending' },
      consent_occupant: { type: Sequelize.BOOLEAN, allowNull: false },
      consent_captured_at: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('b2b_proposals', ['b2b_need_id']);
    await queryInterface.addIndex('b2b_proposals', ['status']);
    await queryInterface.addIndex('b2b_proposals', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('b2b_proposals');
  },
};
