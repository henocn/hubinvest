module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'StudioInvitation',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      createdByUserId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'created_by_user_id',
      },
      occupantId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'occupant_id',
      },
      token: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
      },
      guestName: {
        type: DataTypes.STRING(160),
        allowNull: false,
        field: 'guest_name',
      },
      subject: {
        type: DataTypes.STRING(180),
        allowNull: false,
      },
      scheduledAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'scheduled_at',
      },
      status: {
        type: DataTypes.STRING(24),
        allowNull: false,
        defaultValue: 'pending',
        validate: { isIn: [['pending', 'confirmed', 'declined']] },
      },
      respondedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'responded_at',
      },
    },
    {
      tableName: 'studio_invitations',
      underscored: true,
    },
  );
