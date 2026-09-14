'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('challenge_passages', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      passport_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'challenge_passports', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      occupant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'occupants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      validated_by_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addConstraint('challenge_passages', {
      fields: ['passport_id', 'occupant_id'],
      type: 'unique',
      name: 'challenge_passages_passport_occupant_unique',
    });
    await queryInterface.addIndex('challenge_passages', ['passport_id']);
    await queryInterface.addIndex('challenge_passages', ['occupant_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('challenge_passages');
  },
};
