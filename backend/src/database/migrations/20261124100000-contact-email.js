'use strict';

// « Prendre contact » avec un stand : l'adresse e-mail du visiteur, à côté de son téléphone.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('contacts', 'email', { type: Sequelize.STRING(180), allowNull: true });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('contacts', 'email');
  },
};
