'use strict';

module.exports = {
  // Crée la file d'attente des notifications traitée en arrière-plan.
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('notification_jobs', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      channel: {
        type: Sequelize.STRING(16),
        allowNull: false,
      },
      recipient: {
        type: Sequelize.STRING(180),
        allowNull: false,
      },
      payload: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      dedupe_key: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(16),
        allowNull: false,
        defaultValue: 'pending',
      },
      attempts: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      available_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      locked_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      sent_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      last_error: {
        type: Sequelize.STRING(500),
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

    await queryInterface.addIndex('notification_jobs', ['status', 'available_at']);
    await queryInterface.addIndex('notification_jobs', ['dedupe_key']);
  },

  // Supprime la file d'attente des notifications.
  async down(queryInterface) {
    await queryInterface.dropTable('notification_jobs');
  },
};
