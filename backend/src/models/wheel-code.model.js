// Code de la roue d'un joueur : créé à son premier tour, il est montré quand il gagne pour recevoir son lot. Chaque tour joué est une ligne de wheel_plays.
module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'WheelCode',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      code: {
        type: DataTypes.STRING(12),
        allowNull: false,
        unique: true,
      },
      createdByUserId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'created_by_user_id',
      },
      spinsAllowed: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        field: 'spins_allowed',
      },
    },
    {
      tableName: 'wheel_codes',
      underscored: true,
    },
  );
