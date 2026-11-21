'use strict';

// Document v4 (M6) : parcours « Trouvez les 5 étapes ». Chaque stand appartient à un espace : l'Espace Industrie
// (les quatre premières étapes s'y valident) ou le Stand API-ZF (la dernière étape, et la remise de la récompense).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('occupants', 'space', { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'industry' });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('occupants', 'space');
  },
};
