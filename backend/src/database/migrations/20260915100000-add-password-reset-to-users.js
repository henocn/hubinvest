'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'password_reset_token_hash', {
      type: Sequelize.STRING(64),
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'password_reset_expires_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addIndex('users', ['password_reset_token_hash'], {
      name: 'users_password_reset_token_hash',
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('users', 'users_password_reset_token_hash');
    await queryInterface.removeColumn('users', 'password_reset_expires_at');
    await queryInterface.removeColumn('users', 'password_reset_token_hash');
  },
};
