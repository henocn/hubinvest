'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('b2b_needs', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true },
      occupant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'occupants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      created_by_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      title: { type: Sequelize.STRING(180), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: false },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'open' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('b2b_needs', ['occupant_id']);
    await queryInterface.addIndex('b2b_needs', ['status']);
    await queryInterface.addIndex('b2b_needs', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('b2b_needs');
  },
};
