'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('occupants', 'logo_url', {
      type: Sequelize.STRING(2048),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('occupants', 'logo_url');
  },
};
