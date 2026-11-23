'use strict';

// Journal des actions (document v4, M9) : qui a fait quoi, où et quand dans l'espace équipe. Le nom et le rôle sont
// copiés au moment de l'action, pour rester lisibles si le compte change ou disparaît. Aucun contenu saisi n'y est gardé.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('audit_logs', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true },
      user_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      user_name: { type: Sequelize.STRING(160), allowNull: false },
      user_role: { type: Sequelize.STRING(20), allowNull: false },
      section: { type: Sequelize.STRING(40), allowNull: false },
      action: { type: Sequelize.STRING(120), allowNull: false },
      target: { type: Sequelize.STRING(200), allowNull: true },
      method: { type: Sequelize.STRING(8), allowNull: false },
      path: { type: Sequelize.STRING(255), allowNull: false },
      ip: { type: Sequelize.STRING(64), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('audit_logs', ['created_at']);
    await queryInterface.addIndex('audit_logs', ['user_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('audit_logs');
  },
};
