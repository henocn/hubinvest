'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('ALTER TABLE "contacts" ALTER COLUMN "created_by_user_id" DROP NOT NULL');
    await queryInterface.sequelize.query('ALTER TABLE "contacts" ALTER COLUMN "qualification" DROP NOT NULL');
    await queryInterface.addColumn('contacts', 'source', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'stand',
    });
    await queryInterface.addColumn('contacts', 'consent_captured_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    const [rows] = await queryInterface.sequelize.query(
      'SELECT COUNT(*) AS count FROM "contacts" WHERE "created_by_user_id" IS NULL OR "qualification" IS NULL',
    );
    if (Number(rows[0].count) > 0) {
      throw new Error('Des demandes publiques existent : la migration ne peut pas être annulée sans traitement explicite.');
    }
    await queryInterface.removeColumn('contacts', 'consent_captured_at');
    await queryInterface.removeColumn('contacts', 'source');
    await queryInterface.sequelize.query('ALTER TABLE "contacts" ALTER COLUMN "qualification" SET NOT NULL');
    await queryInterface.sequelize.query('ALTER TABLE "contacts" ALTER COLUMN "created_by_user_id" SET NOT NULL');
  },
};
