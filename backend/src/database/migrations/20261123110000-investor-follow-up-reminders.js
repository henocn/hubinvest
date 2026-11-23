'use strict';

// Relances des guichets : une relance est un rappel au gestionnaire (date et heure, motif). Elle reste « à faire »
// jusqu'à ce qu'on la marque faite, avec la prochaine étape (terminée, relancer, autre). Une classe A ou B crée sa
// relance automatique (auto_class), remplacée si la classe change tant qu'elle n'est pas faite.
// Les anciennes relances (journal de relances déjà faites) deviennent des relances faites ; une prochaine relance
// encore à venir sur un contact devient une relance à faire.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const table = 'investor_follow_ups';
      await queryInterface.addColumn(table, 'due_at', { type: Sequelize.DATE, allowNull: true }, { transaction });
      await queryInterface.addColumn(table, 'reason', { type: Sequelize.STRING(255), allowNull: true }, { transaction });
      await queryInterface.addColumn(table, 'auto_class', { type: Sequelize.STRING(1), allowNull: true }, { transaction });
      await queryInterface.addColumn(table, 'outcome', { type: Sequelize.STRING(12), allowNull: true }, { transaction });
      await queryInterface.addColumn(table, 'outcome_note', { type: Sequelize.STRING(500), allowNull: true }, { transaction });

      await queryInterface.sequelize.query(
        `UPDATE investor_follow_ups
            SET due_at = done_at,
                reason = LEFT(COALESCE(NULLIF(TRIM(note), ''), 'Relance'), 255),
                outcome = CASE WHEN NULLIF(TRIM(next_step), '') IS NULL THEN 'closed' ELSE 'other' END,
                outcome_note = LEFT(NULLIF(TRIM(next_step), ''), 500)`,
        { transaction },
      );
      await queryInterface.changeColumn(table, 'done_at', { type: Sequelize.DATE, allowNull: true }, { transaction });
      await queryInterface.removeColumn(table, 'channel', { transaction });
      await queryInterface.removeColumn(table, 'note', { transaction });
      await queryInterface.removeColumn(table, 'next_step', { transaction });
      await queryInterface.sequelize.query(
        `INSERT INTO investor_follow_ups (id, investor_request_id, due_at, reason, auto_class, created_at, updated_at)
         SELECT gen_random_uuid(), id, next_follow_up_at,
                CASE WHEN classification IN ('A', 'B') THEN 'Relance du contact classé ' || classification ELSE 'Relance prévue' END,
                CASE WHEN classification IN ('A', 'B') THEN classification ELSE NULL END,
                NOW(), NOW()
           FROM investor_requests
          WHERE next_follow_up_at IS NOT NULL AND status <> 'closed'`,
        { transaction },
      );

      await queryInterface.changeColumn(table, 'due_at', { type: Sequelize.DATE, allowNull: false }, { transaction });
      await queryInterface.changeColumn(table, 'reason', { type: Sequelize.STRING(255), allowNull: false }, { transaction });
      await queryInterface.addIndex(table, ['investor_request_id', 'done_at'], { transaction });
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const table = 'investor_follow_ups';
      await queryInterface.removeIndex(table, ['investor_request_id', 'done_at'], { transaction });
      await queryInterface.sequelize.query('DELETE FROM investor_follow_ups WHERE done_at IS NULL', { transaction });
      await queryInterface.addColumn(table, 'channel', { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'call' }, { transaction });
      await queryInterface.addColumn(table, 'note', { type: Sequelize.TEXT, allowNull: true }, { transaction });
      await queryInterface.addColumn(table, 'next_step', { type: Sequelize.STRING(255), allowNull: true }, { transaction });
      await queryInterface.sequelize.query('UPDATE investor_follow_ups SET note = reason, next_step = outcome_note', { transaction });
      await queryInterface.changeColumn(table, 'done_at', { type: Sequelize.DATE, allowNull: false }, { transaction });
      for (const column of ['due_at', 'reason', 'auto_class', 'outcome', 'outcome_note']) {
        await queryInterface.removeColumn(table, column, { transaction });
      }
    });
  },
};
