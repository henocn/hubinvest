'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.removeColumn('investor_requests', 'organization');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('investor_requests', 'organization', {
      type: Sequelize.STRING(180),
      allowNull: true,
    });
  },
};
