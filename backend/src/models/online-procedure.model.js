// Une des démarches déjà en ligne (document v4, § 02), avec le lien vers la plateforme officielle.
const PROCEDURE_DOMAINS = ['free_zone', 'investment_code', 'blue_book'];

module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'OnlineProcedure',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      title: { type: DataTypes.STRING(200), allowNull: false },
      // Zone Franche, Code des investissements ou Carnet Bleu.
      domain: { type: DataTypes.STRING(30), allowNull: false, validate: { isIn: [PROCEDURE_DOMAINS] } },
      url: { type: DataTypes.STRING(500), allowNull: true },
      published: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'online_procedures', underscored: true },
  );

module.exports.PROCEDURE_DOMAINS = PROCEDURE_DOMAINS;
