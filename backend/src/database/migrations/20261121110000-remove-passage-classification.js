'use strict';

// Défi de passage : le stand valide le passage sans classer le joueur (le classement A·B·C du document ne vise que l'Investor Desk).
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeConstraint('challenge_passages', 'challenge_passages_classification_check', { transaction });
      await queryInterface.removeColumn('challenge_passages', 'classification', { transaction });
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn('challenge_passages', 'classification', { type: Sequelize.STRING(1), allowNull: true }, { transaction });
      await queryInterface.addConstraint('challenge_passages', {
        fields: ['classification'],
        type: 'check',
        where: { classification: ['A', 'B', 'C'] },
        name: 'challenge_passages_classification_check',
        transaction,
      });
    });
  },
};
