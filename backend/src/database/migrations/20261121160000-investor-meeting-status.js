'use strict';

// Rendez-vous Investor Desk : prévu, tenu (validé) ou annulé. Annuler garde la trace ; supprimer efface.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('investor_meetings', 'status', { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'scheduled' });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('investor_meetings', 'status');
  },
};
