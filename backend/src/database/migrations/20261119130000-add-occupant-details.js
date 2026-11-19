'use strict';

// Fiche de stand enrichie : produits, services, site web et galerie de photos (5 au plus).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn('occupants', 'products', { type: Sequelize.TEXT, allowNull: true }, { transaction });
      await queryInterface.addColumn('occupants', 'services', { type: Sequelize.TEXT, allowNull: true }, { transaction });
      await queryInterface.addColumn('occupants', 'website', { type: Sequelize.STRING(255), allowNull: true }, { transaction });
      await queryInterface.addColumn('occupants', 'gallery', { type: Sequelize.JSONB, allowNull: false, defaultValue: [] }, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      for (const column of ['gallery', 'website', 'services', 'products']) {
        await queryInterface.removeColumn('occupants', column, { transaction });
      }
    });
  },
};
