'use strict';

const { randomUUID } = require('node:crypto');

// Document v4 (§ 02 et M1, M9) : les six services de l'API-ZF, rattachés aux cinq étapes de l'investisseur,
// et les douze démarches déjà en ligne. Gérés dans l'administration, affichés à l'accueil « Nos services ».
const SERVICES = [
  [1, 'Accueil et orientation', 'Information sur le parcours de l’investisseur et premier diagnostic de projet.', 'Guichet « Mon projet d’investissement » : diagnostic en 15 minutes et prise de rendez-vous', false],
  [3, 'Régimes d’investissement', 'Conditions d’éligibilité et accompagnement aux agréments du Code des investissements et de la zone franche.', 'Guichet « Quel régime pour mon investissement ? » : orientation personnalisée', false],
  [4, 'Facilitation administrative', 'Présentation de la plateforme digitale, orientation et appui dans les démarches auprès des organismes concernés.', 'Tablettes « Services en ligne » : démonstration des 12 démarches', false],
  [4, 'Implantation industrielle', 'Information sur le foncier et les zones économiques.', 'Guichet « Quel régime pour mon investissement ? », sur rendez-vous', true],
  [5, 'Accompagnement après implantation', 'Recueil et suivi des difficultés des entreprises, appui aux extensions et réinvestissements.', 'Guichet « Mon entreprise, mes difficultés » : recueil structuré et engagement de suivi', false],
  [5, 'Opportunités et partenariats', 'Promotion des secteurs porteurs, mise en relation investisseurs, industriels et fournisseurs.', 'Espace Industrie, rencontres B2B, bourse des besoins', false],
];

const PROCEDURES = [
  ['Demande d’agrément provisoire en Zone Franche', 'free_zone'],
  ['Renouvellement d’agrément provisoire en Zone Franche', 'free_zone'],
  ['Suspension d’un agrément provisoire en Zone Franche', 'free_zone'],
  ['Réactivation d’un agrément provisoire en Zone Franche', 'free_zone'],
  ['Demande d’agrément définitif en Zone Franche', 'free_zone'],
  ['Modification du nom sur un agrément en Zone Franche', 'free_zone'],
  ['Ajout d’activités sur un agrément en Zone Franche', 'free_zone'],
  ['Contrat de travail en Zone Franche', 'free_zone'],
  ['Demande d’agrément au Code des investissements', 'investment_code'],
  ['Modification du nom sur un agrément au Code des investissements', 'investment_code'],
  ['Demande de Carnet Bleu', 'blue_book'],
  ['Renouvellement de Carnet Bleu', 'blue_book'],
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const timestamps = {
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    };
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('services', {
        id: { type: Sequelize.UUID, allowNull: false, primaryKey: true },
        position: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        stage: { type: Sequelize.INTEGER, allowNull: false },
        title: { type: Sequelize.STRING(120), allowNull: false },
        promise: { type: Sequelize.TEXT, allowNull: false },
        place: { type: Sequelize.STRING(240), allowNull: true },
        limited: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        published: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...timestamps,
      }, { transaction });
      await queryInterface.createTable('online_procedures', {
        id: { type: Sequelize.UUID, allowNull: false, primaryKey: true },
        position: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        title: { type: Sequelize.STRING(200), allowNull: false },
        domain: { type: Sequelize.STRING(30), allowNull: false },
        url: { type: Sequelize.STRING(500), allowNull: true },
        published: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...timestamps,
      }, { transaction });
      await queryInterface.bulkInsert('services', SERVICES.map(([stage, title, promise, place, limited], index) => ({
        id: randomUUID(), position: index + 1, stage, title, promise, place, limited, published: true,
      })), { transaction });
      await queryInterface.bulkInsert('online_procedures', PROCEDURES.map(([title, domain], index) => ({
        id: randomUUID(), position: index + 1, title, domain, published: true,
      })), { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable('online_procedures', { transaction });
      await queryInterface.dropTable('services', { transaction });
    });
  },
};
