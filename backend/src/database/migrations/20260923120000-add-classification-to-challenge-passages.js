'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('challenge_passages', 'classification', {
      type: Sequelize.STRING(1),
      allowNull: true,
    });

    await queryInterface.addConstraint('challenge_passages', {
      fields: ['classification'],
      type: 'check',
      where: { classification: ['A', 'B', 'C'] },
      name: 'challenge_passages_classification_check',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('challenge_passages', 'challenge_passages_classification_check');
    await queryInterface.removeColumn('challenge_passages', 'classification');
  },
};
