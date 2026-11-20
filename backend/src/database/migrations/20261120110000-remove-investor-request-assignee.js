'use strict';

// Investor Desk : le « responsable » d'une demande est retiré. Il n'était choisi par personne
// (première personne à enregistrer un suivi) ; l'interlocuteur nommé du cadrage viendra avec le classement A·B·C.
module.exports = {
  async up(queryInterface) {
    await queryInterface.removeColumn('investor_requests', 'assigned_to_user_id');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('investor_requests', 'assigned_to_user_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addIndex('investor_requests', ['assigned_to_user_id']);
  },
};
