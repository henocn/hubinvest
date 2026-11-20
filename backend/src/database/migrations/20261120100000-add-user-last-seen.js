'use strict';

// Présence des comptes : dernier moment où l'espace d'équipe était ouvert. Rempli par le flux temps réel et la connexion.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'last_seen_at', { type: Sequelize.DATE, allowNull: true });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'last_seen_at');
  },
};
