'use strict';

// Les joueurs des Défis s'identifient par nom, prénom, e-mail et téléphone ; chaque partie de roue est rattachée au joueur.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn('challenge_passports', 'first_name', { type: Sequelize.STRING(80), allowNull: true }, { transaction });
      await queryInterface.addColumn('challenge_passports', 'last_name', { type: Sequelize.STRING(80), allowNull: true }, { transaction });
      await queryInterface.addColumn('challenge_passports', 'email', { type: Sequelize.STRING(180), allowNull: true }, { transaction });
      await queryInterface.addColumn('challenge_passports', 'phone', { type: Sequelize.STRING(32), allowNull: true }, { transaction });
      await queryInterface.addColumn('wheel_codes', 'passport_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'challenge_passports', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }, { transaction });
      await queryInterface.addIndex('wheel_codes', ['passport_id'], { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn('wheel_codes', 'passport_id', { transaction });
      for (const column of ['phone', 'email', 'last_name', 'first_name']) {
        await queryInterface.removeColumn('challenge_passports', column, { transaction });
      }
    });
  },
};
