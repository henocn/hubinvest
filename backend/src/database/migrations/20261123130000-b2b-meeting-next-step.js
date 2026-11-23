'use strict';

// Compte rendu B2B : la prochaine étape convenue, en texte libre.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('b2b_meetings', 'next_step', { type: Sequelize.STRING(255), allowNull: true });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('b2b_meetings', 'next_step');
  },
};
