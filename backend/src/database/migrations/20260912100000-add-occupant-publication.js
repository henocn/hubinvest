'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('occupants', 'stand_label', {
      type: Sequelize.STRING(80),
      allowNull: true,
    });
    await queryInterface.addColumn('occupants', 'is_published', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('occupants', 'is_published');
    await queryInterface.removeColumn('occupants', 'stand_label');
  },
};
