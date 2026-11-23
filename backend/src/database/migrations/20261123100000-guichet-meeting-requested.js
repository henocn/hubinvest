'use strict';

// Un rendez-vous réservé en ligne aux guichets est une demande (« requested ») que l'équipe confirme. Le créneau reste
// bloqué dès la demande : l'index unique couvre les rendez-vous demandés et confirmés.
const INDEX = 'investor_meetings_guichet_slot_unique';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex('investor_meetings', INDEX, { transaction });
      await queryInterface.addIndex('investor_meetings', ['guichet', 'starts_at'], {
        unique: true,
        where: { status: { [Sequelize.Op.in]: ['requested', 'scheduled'] }, guichet: { [Sequelize.Op.ne]: null } },
        name: INDEX,
        transaction,
      });
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query("UPDATE investor_meetings SET status = 'scheduled' WHERE status = 'requested'", { transaction });
      await queryInterface.removeIndex('investor_meetings', INDEX, { transaction });
      await queryInterface.addIndex('investor_meetings', ['guichet', 'starts_at'], {
        unique: true,
        where: { status: 'scheduled', guichet: { [Sequelize.Op.ne]: null } },
        name: INDEX,
        transaction,
      });
    });
  },
};
