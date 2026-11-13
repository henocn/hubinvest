'use strict';

const crypto = require('node:crypto');

// Lots annoncés par les partenaires : les quantités restent à 0 tant que l'administration ne les a pas saisies.
const prizes = [
  ['WAFO INDUSTRIE', ['Tomate concentrée', 'Pâtes alimentaires', 'T-shirt', 'Tablier', 'Sac de riz', 'Casquette', 'Mayonnaise']],
  ['SEVEN FOOD', ['Tomate concentrée', 'Pâtes alimentaires', 'T-shirt', 'Casquette']],
  ['RODIS', ['Lait de corps']],
  ['LONG HUA', ['Chaussures en plastique']],
  ['SITRAPAT', ['Farine de maïs']],
];

const losingLabels = ['Presque !', 'Pas cette fois', 'Dommage !', 'Merci de votre visite'];

module.exports = {
  // Crée la roue des opportunités : ses cases (lots et cases perdantes) et les codes de jeu à usage unique.
  async up(queryInterface, Sequelize) {
    const timestamps = {
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    };

    await queryInterface.createTable('wheel_segments', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true },
      kind: { type: Sequelize.STRING(10), allowNull: false },
      label: { type: Sequelize.STRING(60), allowNull: false },
      sponsor: { type: Sequelize.STRING(120), allowNull: true },
      quantity: { type: Sequelize.INTEGER, allowNull: true },
      awarded: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      position: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      ...timestamps,
    });

    await queryInterface.createTable('wheel_codes', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true },
      code: { type: Sequelize.STRING(12), allowNull: false, unique: true },
      created_by_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      used_at: { type: Sequelize.DATE, allowNull: true },
      segment_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'wheel_segments', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      result_kind: { type: Sequelize.STRING(10), allowNull: true },
      result_label: { type: Sequelize.STRING(60), allowNull: true },
      result_sponsor: { type: Sequelize.STRING(120), allowNull: true },
      ...timestamps,
    });
    await queryInterface.addIndex('wheel_codes', ['used_at']);
    await queryInterface.addIndex('wheel_codes', ['created_at']);

    let position = 0;
    const rows = [];
    prizes.forEach(([sponsor, labels]) => labels.forEach((label) => {
      position += 1;
      rows.push({ id: crypto.randomUUID(), kind: 'prize', label, sponsor, quantity: 0, awarded: 0, is_active: true, position });
    }));
    losingLabels.forEach((label) => {
      position += 1;
      rows.push({ id: crypto.randomUUID(), kind: 'lose', label, sponsor: null, quantity: null, awarded: 0, is_active: true, position });
    });
    await queryInterface.bulkInsert('wheel_segments', rows);
  },

  // Supprime la roue des opportunités.
  async down(queryInterface) {
    await queryInterface.dropTable('wheel_codes');
    await queryInterface.dropTable('wheel_segments');
  },
};
