'use strict';

// Relances des contacts des stands, sur le modèle des relances des guichets : date et heure, motif, à faire jusqu'à
// « Marquer faite » (prochaine étape : terminée, relancer ou autre). Une classe A ou B crée sa relance automatique.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('contact_follow_ups', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true },
      contact_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'contacts', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      due_at: { type: Sequelize.DATE, allowNull: false },
      reason: { type: Sequelize.STRING(255), allowNull: false },
      auto_source: { type: Sequelize.STRING(12), allowNull: true },
      done_at: { type: Sequelize.DATE, allowNull: true },
      outcome: { type: Sequelize.STRING(12), allowNull: true },
      outcome_note: { type: Sequelize.STRING(500), allowNull: true },
      created_by_user_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('contact_follow_ups', ['contact_id']);
    await queryInterface.addIndex('contact_follow_ups', ['done_at', 'due_at']);

    // Les « prochaines actions » déjà saisies deviennent des relances à faire.
    await queryInterface.sequelize.query(
      `INSERT INTO contact_follow_ups (id, contact_id, due_at, reason, created_by_user_id, created_at, updated_at)
       SELECT gen_random_uuid(), id, next_action_at, LEFT(COALESCE(NULLIF(TRIM(next_action), ''), 'Prochaine action'), 255), created_by_user_id, NOW(), NOW()
       FROM contacts WHERE next_action_at IS NOT NULL`,
    );
    // Contacts A ou B sans relance : leur relance automatique (48 h ou 7 jours après l'enregistrement).
    await queryInterface.sequelize.query(
      `INSERT INTO contact_follow_ups (id, contact_id, due_at, reason, auto_source, created_at, updated_at)
       SELECT gen_random_uuid(), c.id,
              c.created_at + CASE c.qualification WHEN 'A' THEN INTERVAL '48 hours' ELSE INTERVAL '7 days' END,
              'Relance du contact classé ' || c.qualification, c.qualification, NOW(), NOW()
       FROM contacts c
       WHERE c.qualification IN ('A', 'B')
         AND NOT EXISTS (SELECT 1 FROM contact_follow_ups f WHERE f.contact_id = c.id)`,
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('contact_follow_ups');
  },
};
