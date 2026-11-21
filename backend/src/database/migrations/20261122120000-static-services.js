'use strict';

// Les services de l'API-ZF sont devenus un contenu statique (backend/src/shared/services.js) : le service choisi au
// diagnostic ou dans l'engagement de suivi est une clé (« regimes »…), plus une référence à une table.
// Une base qui a joué l'ancienne version des migrations (tables services et online_procedures, colonnes
// recommended_service_id et commitment_service_id) est remise au schéma attendu ; sur une base déjà à jour, rien ne change.
const KEYS_BY_TITLE = {
  'Accueil et orientation': 'orientation',
  'Régimes d’investissement': 'regimes',
  'Facilitation administrative': 'facilitation',
  'Implantation industrielle': 'industrial_site',
  'Accompagnement après implantation': 'aftercare',
  'Opportunités et partenariats': 'partnerships',
};

const tableExists = async (queryInterface, name, transaction) => {
  const [rows] = await queryInterface.sequelize.query('SELECT to_regclass(:name) AS found', { replacements: { name }, transaction });
  return Boolean(rows[0].found);
};

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const columns = await queryInterface.describeTable('investor_requests', { transaction });
      const hasServices = await tableExists(queryInterface, 'services', transaction);

      for (const [oldColumn, newColumn] of [['recommended_service_id', 'recommended_service'], ['commitment_service_id', 'commitment_service']]) {
        if (!columns[newColumn]) {
          await queryInterface.addColumn('investor_requests', newColumn, { type: Sequelize.STRING(40), allowNull: true }, { transaction });
        }
        if (columns[oldColumn]) {
          // Un service déjà choisi garde sa place : son titre donne sa clé.
          if (hasServices) {
            for (const [title, key] of Object.entries(KEYS_BY_TITLE)) {
              await queryInterface.sequelize.query(
                `UPDATE investor_requests SET ${newColumn} = :key FROM services WHERE services.id = investor_requests.${oldColumn} AND services.title = :title`,
                { replacements: { key, title }, transaction },
              );
            }
          }
          await queryInterface.removeColumn('investor_requests', oldColumn, { transaction });
        }
      }

      if (columns.project_summary && !columns.project_summary.allowNull) {
        await queryInterface.changeColumn('investor_requests', 'project_summary', { type: Sequelize.TEXT, allowNull: true }, { transaction });
      }
      if (await tableExists(queryInterface, 'online_procedures', transaction)) await queryInterface.dropTable('online_procedures', { transaction });
      if (hasServices) await queryInterface.dropTable('services', { transaction });
    });
  },

  // Rien à défaire : le schéma obtenu est celui des migrations précédentes dans leur version actuelle.
  async down() {},
};
