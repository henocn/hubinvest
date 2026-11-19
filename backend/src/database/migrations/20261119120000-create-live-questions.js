'use strict';

// Questions posées par le public pendant une émission du Studio ou une prise de parole, reçues par l'animateur.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('live_questions', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      program_event_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'program_events', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      author_name: { type: Sequelize.STRING(80), allowNull: true },
      question: { type: Sequelize.TEXT, allowNull: false },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'new' },
      handled_by_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      handled_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('live_questions', ['program_event_id', 'created_at']);
    await queryInterface.addIndex('live_questions', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('live_questions');
  },
};
