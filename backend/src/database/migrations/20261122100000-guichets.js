'use strict';

// Document v4 (M3) : l'Investor Desk devient « Les guichets et le registre unique ». Chaque contact est rattaché à l'un
// des trois guichets du Stand API-ZF, vient d'un rendez-vous réservé en ligne, d'une demande de rappel ou d'un passage
// au guichet, porte sa fiche de diagnostic (15 minutes) ou sa fiche « Mon entreprise, mes difficultés » avec un
// engagement de suivi, et peut être classé « Accompagnement » en plus de A·B·C.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const add = (column, definition) => queryInterface.addColumn('investor_requests', column, definition, { transaction });
      const serviceReference = { type: Sequelize.UUID, allowNull: true, references: { model: 'services', key: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' };
      await add('guichet', { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'project' });
      await add('source', { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'callback' });
      await add('organization', { type: Sequelize.STRING(160), allowNull: true });
      await add('recommended_service_id', serviceReference);
      await add('diagnosed_at', { type: Sequelize.DATE, allowNull: true });
      await add('difficulty', { type: Sequelize.JSONB, allowNull: true });
      await add('commitment_service_id', serviceReference);
      await add('commitment_due_at', { type: Sequelize.DATE, allowNull: true });
      await add('commitment_note', { type: Sequelize.TEXT, allowNull: true });
      await add('resolved_at', { type: Sequelize.DATE, allowNull: true });
      await queryInterface.changeColumn('investor_requests', 'classification', { type: Sequelize.STRING(12), allowNull: true }, { transaction });
      // Un rendez-vous réservé en ligne ne demande pas d'objet : le guichet choisi suffit.
      await queryInterface.changeColumn('investor_requests', 'project_summary', { type: Sequelize.TEXT, allowNull: true }, { transaction });
      await queryInterface.addIndex('investor_requests', ['guichet'], { transaction });

      // Un créneau de guichet ne se réserve qu'une fois, même par deux personnes au même instant.
      await queryInterface.addColumn('investor_meetings', 'guichet', { type: Sequelize.STRING(20), allowNull: true }, { transaction });
      await queryInterface.addIndex('investor_meetings', ['guichet', 'starts_at'], {
        unique: true,
        where: { status: 'scheduled', guichet: { [Sequelize.Op.ne]: null } },
        name: 'investor_meetings_guichet_slot_unique',
        transaction,
      });
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex('investor_meetings', 'investor_meetings_guichet_slot_unique', { transaction });
      await queryInterface.removeColumn('investor_meetings', 'guichet', { transaction });
      await queryInterface.removeIndex('investor_requests', ['guichet'], { transaction });
      await queryInterface.sequelize.query("UPDATE investor_requests SET classification = NULL WHERE classification = 'support'", { transaction });
      await queryInterface.changeColumn('investor_requests', 'classification', { type: Sequelize.STRING(1), allowNull: true }, { transaction });
      await queryInterface.sequelize.query("UPDATE investor_requests SET project_summary = 'Rendez-vous au guichet' WHERE project_summary IS NULL", { transaction });
      await queryInterface.changeColumn('investor_requests', 'project_summary', { type: Sequelize.TEXT, allowNull: false }, { transaction });
      for (const column of ['guichet', 'source', 'organization', 'recommended_service_id', 'diagnosed_at', 'difficulty', 'commitment_service_id', 'commitment_due_at', 'commitment_note', 'resolved_at']) {
        await queryInterface.removeColumn('investor_requests', column, { transaction });
      }
    });
  },
};
