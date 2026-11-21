'use strict';

// Investor Desk : le statut n'est plus saisi mais calculé (À traiter, À relancer, Terminé) ; les relances se font
// par appel ou par message. Les demandes existantes reçoivent leur statut calculé.
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        UPDATE investor_requests AS r SET status = CASE
          WHEN r.next_follow_up_at IS NOT NULL THEN 'in_progress'
          WHEN r.classification IS NOT NULL OR EXISTS (SELECT 1 FROM investor_follow_ups AS f WHERE f.investor_request_id = r.id) THEN 'closed'
          ELSE 'new'
        END
      `, { transaction });
      await queryInterface.sequelize.query("UPDATE investor_follow_ups SET channel = 'message' WHERE channel NOT IN ('call', 'message')", { transaction });
    });
  },

  // Les anciens statuts saisis à la main ne peuvent pas être retrouvés ; le statut calculé reste valide.
  async down() {},
};
