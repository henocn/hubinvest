'use strict';

// Roue : un code n'expire plus et peut donner plusieurs tours (réglage). Chaque tour joué devient une ligne de wheel_plays,
// avec son résultat et la remise du lot ; wheel_codes ne garde que le code, qui l'a délivré et le nombre de tours permis.
// Les codes jamais joués et déjà expirés sont effacés : sans expiration, ils redeviendraient valables.
const MOVED_COLUMNS = ['passport_id', 'expires_at', 'used_at', 'segment_id', 'result_kind', 'result_label', 'result_sponsor', 'claimed_at', 'claimed_by_user_id'];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('wheel_plays', {
        id: { type: Sequelize.UUID, allowNull: false, primaryKey: true },
        wheel_code_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'wheel_codes', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        passport_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'challenge_passports', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        segment_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'wheel_segments', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        result_kind: { type: Sequelize.STRING(10), allowNull: false },
        result_label: { type: Sequelize.STRING(60), allowNull: false },
        result_sponsor: { type: Sequelize.STRING(120), allowNull: true },
        played_at: { type: Sequelize.DATE, allowNull: false },
        claimed_at: { type: Sequelize.DATE, allowNull: true },
        claimed_by_user_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      }, { transaction });
      await queryInterface.addIndex('wheel_plays', ['wheel_code_id'], { transaction });
      await queryInterface.addIndex('wheel_plays', ['passport_id', 'played_at'], { transaction });
      await queryInterface.addIndex('wheel_plays', ['played_at'], { transaction });

      // Une partie déjà jouée devient un tour ; il garde l'identifiant de son code (un seul tour par code jusqu'ici).
      await queryInterface.sequelize.query(`
        INSERT INTO wheel_plays (id, wheel_code_id, passport_id, segment_id, result_kind, result_label, result_sponsor, played_at, claimed_at, claimed_by_user_id, created_at, updated_at)
        SELECT id, id, passport_id, segment_id, result_kind, result_label, result_sponsor, used_at, claimed_at, claimed_by_user_id, used_at, updated_at
        FROM wheel_codes
        WHERE used_at IS NOT NULL AND result_kind IS NOT NULL
      `, { transaction });
      await queryInterface.sequelize.query('DELETE FROM wheel_codes WHERE used_at IS NULL AND expires_at <= NOW()', { transaction });

      await queryInterface.addColumn('wheel_codes', 'spins_allowed', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 }, { transaction });
      for (const column of MOVED_COLUMNS) {
        await queryInterface.removeColumn('wheel_codes', column, { transaction });
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const userReference = { references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' };
      await queryInterface.addColumn('wheel_codes', 'passport_id', { type: Sequelize.UUID, allowNull: true, references: { model: 'challenge_passports', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' }, { transaction });
      await queryInterface.addColumn('wheel_codes', 'expires_at', { type: Sequelize.DATE, allowNull: true }, { transaction });
      await queryInterface.addColumn('wheel_codes', 'used_at', { type: Sequelize.DATE, allowNull: true }, { transaction });
      await queryInterface.addColumn('wheel_codes', 'segment_id', { type: Sequelize.UUID, allowNull: true, references: { model: 'wheel_segments', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' }, { transaction });
      await queryInterface.addColumn('wheel_codes', 'result_kind', { type: Sequelize.STRING(10), allowNull: true }, { transaction });
      await queryInterface.addColumn('wheel_codes', 'result_label', { type: Sequelize.STRING(60), allowNull: true }, { transaction });
      await queryInterface.addColumn('wheel_codes', 'result_sponsor', { type: Sequelize.STRING(120), allowNull: true }, { transaction });
      await queryInterface.addColumn('wheel_codes', 'claimed_at', { type: Sequelize.DATE, allowNull: true }, { transaction });
      await queryInterface.addColumn('wheel_codes', 'claimed_by_user_id', { type: Sequelize.UUID, allowNull: true, ...userReference }, { transaction });

      // Le premier tour de chaque code revient sur le code ; les tours suivants sont perdus (l'ancien schéma n'en gardait qu'un).
      await queryInterface.sequelize.query(`
        UPDATE wheel_codes AS c
        SET passport_id = p.passport_id, used_at = p.played_at, segment_id = p.segment_id, result_kind = p.result_kind,
            result_label = p.result_label, result_sponsor = p.result_sponsor, claimed_at = p.claimed_at, claimed_by_user_id = p.claimed_by_user_id
        FROM (SELECT DISTINCT ON (wheel_code_id) * FROM wheel_plays ORDER BY wheel_code_id, played_at) AS p
        WHERE p.wheel_code_id = c.id
      `, { transaction });
      await queryInterface.sequelize.query("UPDATE wheel_codes SET expires_at = COALESCE(used_at, created_at + INTERVAL '30 minutes')", { transaction });
      await queryInterface.changeColumn('wheel_codes', 'expires_at', { type: Sequelize.DATE, allowNull: false }, { transaction });
      await queryInterface.addIndex('wheel_codes', ['used_at'], { transaction });
      await queryInterface.addIndex('wheel_codes', ['passport_id', 'used_at'], { transaction });

      await queryInterface.removeColumn('wheel_codes', 'spins_allowed', { transaction });
      await queryInterface.dropTable('wheel_plays', { transaction });
    });
  },
};
