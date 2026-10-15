'use strict';

module.exports = {
  // Crée le programme du Hub : occupant à l'affiche, animations, Studio, prises de parole et temps forts.
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('program_events', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      occupant_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'occupants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      type: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING(180),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      location: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      starts_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      ends_at: {
        type: Sequelize.DATE,
        allowNull: true,
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

    await queryInterface.addIndex('program_events', ['starts_at']);
    await queryInterface.addIndex('program_events', ['type', 'starts_at']);
  },

  // Supprime le programme du Hub.
  async down(queryInterface) {
    await queryInterface.dropTable('program_events');
  },
};
