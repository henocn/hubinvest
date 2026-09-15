'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeIndex('users', 'users_password_reset_token_hash');
    await queryInterface.renameColumn('users', 'password_reset_token_hash', 'password_reset_code_hash');
    await queryInterface.addColumn('users', 'password_reset_attempts', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'password_reset_attempts');
    await queryInterface.renameColumn('users', 'password_reset_code_hash', 'password_reset_token_hash');
    await queryInterface.addIndex('users', ['password_reset_token_hash'], {
      name: 'users_password_reset_token_hash',
      unique: true,
    });
  },
};
