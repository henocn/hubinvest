'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('challenge_passports', 'contact', {
      type: Sequelize.STRING(180),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('challenge_passports', 'contact');
  },
};
