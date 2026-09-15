'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('investor_requests', 'occupant_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'occupants', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addIndex('investor_requests', ['occupant_id']);

    await queryInterface.addColumn('studio_invitations', 'occupant_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'occupants', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addIndex('studio_invitations', ['occupant_id']);

    await queryInterface.bulkUpdate('users', { is_active: false }, { role: 'admin', occupant_id: null });
    await queryInterface.removeColumn('users', 'admin_scope');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'admin_scope', {
      type: Sequelize.STRING(40),
      allowNull: true,
    });
    await queryInterface.bulkUpdate('users', { admin_scope: 'all' }, { role: 'admin' });
    await queryInterface.removeColumn('studio_invitations', 'occupant_id');
    await queryInterface.removeColumn('investor_requests', 'occupant_id');
  },
};
