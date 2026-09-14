'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('challenge_passports', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      redeemed_by_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      token: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true,
      },
      code: {
        type: Sequelize.STRING(8),
        allowNull: false,
        unique: true,
      },
      display_name: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING(24),
        allowNull: false,
        defaultValue: 'active',
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      redeemed_at: {
        type: Sequelize.DATE,
        allowNull: true,
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

    await queryInterface.addIndex('challenge_passports', ['status']);
    await queryInterface.addIndex('challenge_passports', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('challenge_passports');
  },
};
