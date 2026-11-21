'use strict';

// Roue des opportunités : les lots ne viennent pas de partenaires, le champ « partenaire » disparaît des cases et des parties.
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn('wheel_segments', 'sponsor', { transaction });
      await queryInterface.removeColumn('wheel_plays', 'result_sponsor', { transaction });
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn('wheel_segments', 'sponsor', { type: Sequelize.STRING(120), allowNull: true }, { transaction });
      await queryInterface.addColumn('wheel_plays', 'result_sponsor', { type: Sequelize.STRING(120), allowNull: true }, { transaction });
    });
  },
};
