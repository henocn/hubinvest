module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'Occupant',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(160),
        allowNull: false,
      },
      slug: {
        type: DataTypes.STRING(180),
        allowNull: false,
        unique: true,
      },
      proofNumber: {
        type: DataTypes.INTEGER,
        allowNull: true,
        unique: true,
        field: 'proof_number',
      },
      activity: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'active',
        validate: { isIn: [['active', 'inactive']] },
      },
    },
    {
      tableName: 'occupants',
      underscored: true,
    },
  );
