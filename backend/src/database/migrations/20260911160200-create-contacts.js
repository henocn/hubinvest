'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('contacts', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      occupant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'occupants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      created_by_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      full_name: {
        type: Sequelize.STRING(160),
        allowNull: false,
      },
      phone: {
        type: Sequelize.STRING(32),
        allowNull: false,
      },
      company: {
        type: Sequelize.STRING(160),
        allowNull: true,
      },
      need: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      qualification: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'cold',
      },
      next_action: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      next_action_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      consent_occupant: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      consent_apizf: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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

    await queryInterface.addIndex('contacts', ['occupant_id', 'created_at']);
    await queryInterface.addIndex('contacts', ['occupant_id', 'qualification']);
    await queryInterface.addIndex('contacts', ['next_action_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('contacts');
  },
};
