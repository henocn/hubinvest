'use strict';

// Contacts des stands : la qualification chaud · tiède · froid devient A · B · C, sur le modèle de l'Investor Desk.
// A = prioritaire (recontacter sous 48 h), B = à suivre (sous 7 jours), C = à nourrir (informations futures).
const swap = (pairs) => `UPDATE contacts SET qualification = CASE qualification ${Object.entries(pairs).map(([from, to]) => `WHEN '${from}' THEN '${to}'`).join(' ')} ELSE qualification END`;

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(swap({ hot: 'A', warm: 'B', cold: 'C' }), { transaction });
      await queryInterface.sequelize.query("ALTER TABLE contacts ALTER COLUMN qualification SET DEFAULT 'C'", { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(swap({ A: 'hot', B: 'warm', C: 'cold' }), { transaction });
      await queryInterface.sequelize.query("ALTER TABLE contacts ALTER COLUMN qualification SET DEFAULT 'cold'", { transaction });
    });
  },
};
