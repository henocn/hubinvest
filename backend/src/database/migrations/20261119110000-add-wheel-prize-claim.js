'use strict';

// Un lot gagné à la roue est marqué « remis » une seule fois, avec la personne de l'équipe qui l'a remis.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn('wheel_codes', 'claimed_at', { type: Sequelize.DATE, allowNull: true }, { transaction });
      await queryInterface.addColumn('wheel_codes', 'claimed_by_user_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }, { transaction });
      await queryInterface.addIndex('wheel_codes', ['passport_id', 'used_at'], { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex('wheel_codes', ['passport_id', 'used_at'], { transaction });
      await queryInterface.removeColumn('wheel_codes', 'claimed_by_user_id', { transaction });
      await queryInterface.removeColumn('wheel_codes', 'claimed_at', { transaction });
    });
  },
};
