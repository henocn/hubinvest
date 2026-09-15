'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'admin_scope', {
      type: Sequelize.STRING(40),
      allowNull: true,
    });

    await queryInterface.bulkUpdate('users', { role: 'admin', admin_scope: 'all' }, { role: 'admin-apizf' });
    await queryInterface.bulkUpdate('users', { role: 'admin', admin_scope: 'investor-desk' }, { role: 'investor-desk' });
    await queryInterface.bulkUpdate('users', { role: 'admin', admin_scope: 'campagne' }, { role: 'equipe-campagne' });
    await queryInterface.bulkUpdate('users', { role: 'occupant', admin_scope: null }, { role: ['occupant-responsable', 'occupant-membre'] });
    await queryInterface.bulkUpdate('users', { role: 'occupant', admin_scope: null, is_active: false }, { role: 'visiteur' });
  },

  async down(queryInterface) {
    await queryInterface.bulkUpdate('users', { role: 'admin-apizf' }, { role: 'admin', admin_scope: 'all' });
    await queryInterface.bulkUpdate('users', { role: 'investor-desk' }, { role: 'admin', admin_scope: 'investor-desk' });
    await queryInterface.bulkUpdate('users', { role: 'equipe-campagne' }, { role: 'admin', admin_scope: 'campagne' });
    await queryInterface.bulkUpdate('users', { role: 'admin-apizf' }, { role: 'admin', admin_scope: 'b2b' });
    await queryInterface.bulkUpdate('users', { role: 'occupant-responsable' }, { role: 'occupant' });
    await queryInterface.removeColumn('users', 'admin_scope');
  },
};
