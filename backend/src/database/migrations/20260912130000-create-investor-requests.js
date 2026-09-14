'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('investor_requests', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      assigned_to_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      full_name: {
        type: Sequelize.STRING(160),
        allowNull: false,
      },
      organization: {
        type: Sequelize.STRING(180),
        allowNull: true,
      },
      email: {
        type: Sequelize.STRING(180),
        allowNull: false,
      },
      phone: {
        type: Sequelize.STRING(32),
        allowNull: true,
      },
      project_summary: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING(24),
        allowNull: false,
        defaultValue: 'new',
      },
      next_action: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      consent_apizf: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
      },
      consent_captured_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('investor_requests', ['status']);
    await queryInterface.addIndex('investor_requests', ['assigned_to_user_id']);
    await queryInterface.addIndex('investor_requests', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('investor_requests');
  },
};
