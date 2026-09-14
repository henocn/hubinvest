'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('studio_invitations', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      created_by_user_id: {
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
      guest_name: {
        type: Sequelize.STRING(160),
        allowNull: false,
      },
      subject: {
        type: Sequelize.STRING(180),
        allowNull: false,
      },
      scheduled_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING(24),
        allowNull: false,
        defaultValue: 'pending',
      },
      responded_at: {
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

    await queryInterface.addIndex('studio_invitations', ['scheduled_at']);
    await queryInterface.addIndex('studio_invitations', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('studio_invitations');
  },
};
