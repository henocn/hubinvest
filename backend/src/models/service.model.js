// Un service de l'API-ZF (document v4, § 02) : son étape du parcours de l'investisseur, sa promesse et où le vivre à la Foire.
const SERVICE_STAGES = [1, 2, 3, 4, 5];

module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'Service',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      // Étape « Investir au Togo en 5 étapes » : 1 S'informer … 5 Développer ses activités.
      stage: { type: DataTypes.INTEGER, allowNull: false, validate: { isIn: [SERVICE_STAGES] } },
      title: { type: DataTypes.STRING(120), allowNull: false },
      promise: { type: DataTypes.TEXT, allowNull: false },
      place: { type: DataTypes.STRING(240), allowNull: true },
      // « Selon disponibilités » : le document demande de ne rien promettre au-delà (implantation industrielle).
      limited: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      published: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'services', underscored: true },
  );

module.exports.SERVICE_STAGES = SERVICE_STAGES;
