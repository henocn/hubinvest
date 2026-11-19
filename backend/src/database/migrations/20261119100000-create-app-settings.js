'use strict';

// Réglages modifiables depuis l'administration (ouverture des modules, nombre de stands des Défis…), sans redéploiement.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('app_settings', {
      key: { type: Sequelize.STRING(60), primaryKey: true },
      value: { type: Sequelize.JSONB, allowNull: false },
      updated_by_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('app_settings');
  },
};
