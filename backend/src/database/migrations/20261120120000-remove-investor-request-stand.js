'use strict';

// Investor Desk : guichet de l'API-ZF (cadrage, « Rencontrer l'API-ZF »). Une demande n'est plus adressée à un stand.
module.exports = {
  async up(queryInterface) {
    await queryInterface.removeColumn('investor_requests', 'occupant_id');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('investor_requests', 'occupant_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'occupants', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addIndex('investor_requests', ['occupant_id']);
  },
};
