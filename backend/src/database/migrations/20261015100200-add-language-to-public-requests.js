'use strict';

module.exports = {
  // Conserve la langue du visiteur pour lui répondre par e-mail dans cette langue.
  async up(queryInterface, Sequelize) {
    const column = { type: Sequelize.STRING(2), allowNull: false, defaultValue: 'fr' };
    await queryInterface.addColumn('investor_requests', 'language', column);
    await queryInterface.addColumn('b2b_proposals', 'language', column);
  },

  // Retire la langue des demandes publiques.
  async down(queryInterface) {
    await queryInterface.removeColumn('b2b_proposals', 'language');
    await queryInterface.removeColumn('investor_requests', 'language');
  },
};
