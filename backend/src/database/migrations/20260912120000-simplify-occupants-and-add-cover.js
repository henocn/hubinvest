'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn('occupants', 'proof_number');
    await queryInterface.removeColumn('occupants', 'is_published');
    await queryInterface.addColumn('occupants', 'cover_image_url', {
      type: Sequelize.STRING(2048),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('occupants', 'cover_image_url');
    await queryInterface.addColumn('occupants', 'proof_number', {
      type: Sequelize.INTEGER,
      allowNull: true,
      unique: true,
    });
    await queryInterface.addColumn('occupants', 'is_published', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },
};
