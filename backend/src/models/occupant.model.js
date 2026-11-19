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
      standLabel: {
        type: DataTypes.STRING(80),
        allowNull: true,
        field: 'stand_label',
      },
      coverImageUrl: {
        type: DataTypes.STRING(2048),
        allowNull: true,
        field: 'cover_image_url',
      },
      logoUrl: {
        type: DataTypes.STRING(2048),
        allowNull: true,
        field: 'logo_url',
      },
      activity: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      // Produits et services : une entrée par ligne, affichées en liste sur la fiche publique.
      products: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      services: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      website: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      // Photos des produits ou du stand (adresses /uploads/gallery/…), 5 au plus.
      gallery: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
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
